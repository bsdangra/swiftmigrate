// services/dependencyResolver.js

// 🔍 Extract class usages like: new LoginPage(), LoginPage.login()
export function extractUsedClasses(code = "") {
  const regex = /\bnew\s+(\w+)|\b(\w+)\s*\./g;
  const classes = new Set();

  let match;
  while ((match = regex.exec(code)) !== null) {
    if (match[1]) classes.add(match[1]);
    if (match[2]) classes.add(match[2]);
  }

  return Array.from(classes);
}


// 🔧 Normalize file name → class name
function getClassName(fileName = "") {
  return fileName.replace(".java", "").toLowerCase();
}


// 🔗 Build Dependency Graph
export function buildDependencyGraph(mappedTests, pageObjects, baseClasses) {
  const graph = {};

  // 🔥 1. Combine all relevant files
  const allFiles = [
    ...mappedTests,
    ...pageObjects,
    ...baseClasses
  ];

  // 🔥 2. Create quick lookup set
  const fileNameSet = new Set(
    allFiles.map(f => f.fileName.toLowerCase())
  );

  // 🔥 3. Initialize graph nodes
  allFiles.forEach(file => {
    graph[file.fileName] = {
      file,
      dependsOn: [],
      type: file.type
    };
  });

  // 🔥 4. Resolve dependencies (ONLY execution relevant)
  allFiles.forEach(file => {
    let dependencies = [];

    // ✅ Test files → depend on mapped POMs
    if (file.type === "test" && file.mappedPOMs) {
      dependencies = file.mappedPOMs.map(p => p.fileName);
    }

    // ✅ Page objects → optional base class dependency (future-safe)
    // (only if you later detect inheritance like "extends BasePage")
    // if (file.type === "pageObject" && file.baseClass) {
    //   dependencies.push(file.baseClass);
    // }

    // 🔥 5. Clean dependencies

    // remove duplicates
    dependencies = [...new Set(dependencies)];

    // keep only valid project files
    dependencies = dependencies.filter(dep =>
      fileNameSet.has(dep.toLowerCase())
    );

    // remove self-dependency (safety)
    dependencies = dependencies.filter(dep =>
      dep !== file.fileName
    );

    graph[file.fileName].dependsOn = dependencies;
  });

  return graph;
}


// 🧠 Detect file type
function detectType(fileName = "") {
  const name = fileName.toLowerCase();

  if (name.includes("test")) return "test";
  if (name.includes("page")) return "page";
  if (name.includes("base")) return "base";

  return "unknown";
}

export function topoSortWithBuckets(graph) {
  const normalize = (name) => name.trim().toLowerCase();

  const normalizedGraph = {};

  for (const node in graph) {
    const normNode = normalize(node);

    normalizedGraph[normNode] = {
      original: node,
      dependsOn: (graph[node].dependsOn || []).map(normalize)
    };
  }

  const inDegree = {};
  const adj = {};

  // init
  for (const node in normalizedGraph) {
    inDegree[node] = 0;
    adj[node] = [];
  }

  // build graph
  for (const node in normalizedGraph) {
    const deps = normalizedGraph[node].dependsOn;

    deps.forEach(dep => {
      if (!normalizedGraph[dep]) {
        console.warn(`⚠️ Missing dependency: ${dep} for ${node}`);
        return; // ignore but don't crash
      }

      adj[dep].push(node);
      inDegree[node]++;
    });
  }

  // queue init
  const queue = [];
  for (const node in inDegree) {
    if (inDegree[node] === 0) {
      queue.push(node);
    }
  }

  // BFS
  const ordered = [];

  while (queue.length > 0) {
    const current = queue.shift();
    ordered.push(normalizedGraph[current].original);

    for (const neighbor of adj[current]) {
      inDegree[neighbor]--;

      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  // 🔥 Unprocessed nodes = problematic
  const unordered = Object.keys(normalizedGraph)
    .filter(n => !ordered.includes(normalizedGraph[n].original))
    .map(n => normalizedGraph[n].original);

  return {
    ordered,
    unordered
  };
}


// 🧠 Build context for LLM (IMPORTANT)
export function buildContext(fileName, graph, memory = {}) {
  const node = graph[fileName];

  if (!node) return {};

  const dependencies = node.dependsOn.map(dep => ({
    fileName: dep,
    content: memory[dep]?.content || ""
  }));

  return {
    currentFile: fileName,
    type: node.type,
    dependencies
  };
}