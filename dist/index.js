"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const commander_1 = require("commander");
const program = new commander_1.Command();
/**
 * Recursively walk through a directory and add .jsx/.tsx files to results.
 */
function walk(dir, results) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath, results);
        }
        else if (stat.isFile() && (fullPath.endsWith(".jsx") || fullPath.endsWith(".tsx"))) {
            results.push(fullPath);
        }
    }
}
/**
 * Get component files.
 * If includeDirs is provided, only scan those directories (relative to the project root).
 */
function getComponentFiles(directory, includeDirs) {
    const results = [];
    const mainDir = path.resolve(directory);
    if (includeDirs && includeDirs.length > 0) {
        for (const inc of includeDirs) {
            const targetDir = path.resolve(mainDir, inc);
            if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
                walk(targetDir, results);
            }
            else {
                console.warn(`Warning: Include directory '${inc}' does not exist or is not a directory.`);
            }
        }
    }
    else {
        walk(mainDir, results);
    }
    return results;
}
/**
 * Derive component name from file name.
 */
function extractComponentName(filePath) {
    return path.basename(filePath, path.extname(filePath));
}
/**
 * Extract components imported from external libraries (to be ignored).
 */
function extractImportedIgnoredComponents(content, ignoreLibs) {
    const ignored = new Set();
    // Default imports: e.g. import Component from 'lib'
    const defaultImportRegex = /import\s+([A-Z][a-zA-Z0-9_]*)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = defaultImportRegex.exec(content)) !== null) {
        const comp = match[1];
        const module = match[2];
        if (ignoreLibs.includes(module)) {
            ignored.add(comp);
        }
    }
    // Named imports: e.g. import { CompA, CompB as Alias } from 'lib'
    const namedImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
    while ((match = namedImportRegex.exec(content)) !== null) {
        const comps = match[1]; // e.g. "CompA, CompB as Alias"
        const module = match[2];
        if (ignoreLibs.includes(module)) {
            comps.split(",").forEach((item) => {
                const compName = item.trim().split(" as ")[0].trim();
                if (compName) {
                    ignored.add(compName);
                }
            });
        }
    }
    return ignored;
}
/**
 * Extract used components from file content by matching JSX tags.
 * Then, remove any components that are imported from ignored libraries.
 */
function extractUsedComponents(content, ignoreLibs) {
    const used = new Set();
    const regex = /<([A-Z][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        used.add(match[1]);
    }
    const ignored = extractImportedIgnoredComponents(content, ignoreLibs);
    for (const ign of ignored) {
        used.delete(ign);
    }
    return used;
}
/**
 * Recursively generate markdown tree structure.
 */
function generateMarkdownTree(graph, node, indent, visited = new Set()) {
    let md = "  ".repeat(indent) + `- ${node}\n`;
    if (visited.has(node)) {
        return md;
    }
    visited.add(node);
    const children = graph.get(node);
    if (children) {
        const sortedChildren = Array.from(children).sort();
        for (const child of sortedChildren) {
            md += generateMarkdownTree(graph, child, indent + 1, new Set(visited));
        }
    }
    return md;
}
/**
 * Main function: build the component graph and generate the markdown file.
 */
function main(directory, ignoreLibs, projectOnly, includeDirs) {
    const files = getComponentFiles(directory, includeDirs);
    if (files.length === 0) {
        console.error("No component files found in the given directory.");
        process.exit(1);
    }
    // Map each file to its component name.
    const fileToComponent = new Map();
    for (const file of files) {
        const compName = extractComponentName(file);
        fileToComponent.set(file, compName);
    }
    const componentSet = new Set(Array.from(fileToComponent.values()));
    // Build the graph: component -> set of used components.
    const graph = new Map();
    for (const [file, comp] of fileToComponent.entries()) {
        const content = fs.readFileSync(file, "utf-8");
        const used = extractUsedComponents(content, ignoreLibs);
        const filtered = new Set();
        for (const usedComp of used) {
            if (!projectOnly || componentSet.has(usedComp)) {
                filtered.add(usedComp);
            }
        }
        graph.set(comp, filtered);
    }
    // Determine root components (those not used by any other).
    const inDegree = new Map();
    for (const comp of graph.keys()) {
        inDegree.set(comp, 0);
    }
    for (const [, children] of graph.entries()) {
        for (const child of children) {
            inDegree.set(child, (inDegree.get(child) || 0) + 1);
        }
    }
    const roots = [];
    for (const [comp, degree] of inDegree.entries()) {
        if (degree === 0) {
            roots.push(comp);
        }
    }
    // Build Markdown content.
    let markdown = `---\n`;
    markdown += `title: Component Tree\n`;
    markdown += `markmap:\n  colorFreezeLevel: 4\n`;
    markdown += `---\n\n`;
    for (const root of roots.sort()) {
        markdown += `## ${root}\n\n`;
        markdown += generateMarkdownTree(graph, root, 0) + "\n";
    }
    fs.writeFileSync("componentsTree.mm.md", markdown, "utf-8");
    console.log("Generated componentsTree.mm.md ✅");
}
program
    .argument("[directory]", "Root directory of the React project", ".")
    .option("--ignore-libs <libs...>", "List of library names to ignore components from", [])
    .option("--project-only", "Only include components defined in the project", false)
    .option("--in <dirs...>", "List of directories to scan (relative to the project directory)", [])
    .action((directory, options) => {
    main(directory, options.ignoreLibs, options.projectOnly, options.in);
});
program.parse(process.argv);
