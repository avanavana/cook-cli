export interface RecipeNodeTemplate {
  id: string;
  name: string;
  line: number;
  children: RecipeNodeTemplate[];
  forcedFile: boolean;
}

export interface RecipeContentBlockTemplate {
  header: string;
  body: string;
  startLine: number;
}

export interface RecipeTemplate {
  source: string;
  outline: RecipeNodeTemplate[];
  contentBlocks: RecipeContentBlockTemplate[];
  indentationWidth: number | null;
}

export interface RenderedRecipeNode {
  id: string;
  sourceNodeId: string;
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  children: RenderedRecipeNode[];
}

export interface RenderedRecipeFile {
  nodeId: string;
  relativePath: string;
  content: string;
}

export interface RenderedRecipe {
  roots: RenderedRecipeNode[];
  files: RenderedRecipeFile[];
  bindings: Record<string, string>;
  variableOrder: string[];
}

export interface DirectoryPlanEntry {
  relativePath: string;
  absolutePath: string;
  status: 'create' | 'existing' | 'conflict';
  reason?: string;
}

export interface FilePlanEntry {
  relativePath: string;
  absolutePath: string;
  content: string;
  status: 'create' | 'overwrite' | 'skip' | 'conflict';
  reason?: string;
}

export interface ExecutionPlan {
  outDirectory: string;
  directories: DirectoryPlanEntry[];
  files: FilePlanEntry[];
  bindings: Record<string, string>;
  tree: string;
  conflicts: string[];
}

export interface VariableResolutionOptions {
  explicitBindings?: Record<string, string>;
  positionalArguments?: string[];
}
