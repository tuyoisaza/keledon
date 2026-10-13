function registerPipelineMethods(methodsClass) {
  for (const name of Object.getOwnPropertyNames(methodsClass.prototype)) {
    if (name === 'constructor') continue;
    Object.defineProperty(
      PipelineManager.prototype,
      name,
      Object.getOwnPropertyDescriptor(methodsClass.prototype, name),
    );
  }
}
