const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    if (!sourcePath.endsWith('.ts')) {
      return { code: sourceText };
    }

    const result = ts.transpileModule(sourceText, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        allowSyntheticDefaultImports: true,
        sourceMap: false,
      },
      fileName: sourcePath,
    });

    return { code: result.outputText };
  },
};
