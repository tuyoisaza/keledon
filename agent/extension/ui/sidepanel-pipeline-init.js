// Initialize pipeline manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pipelineManager = new PipelineManager();
  
  // Initialize all stages to idle
  const stages = ['listen', 'transcribe', 'think', 'respond', 'speak', 'act'];
  stages.forEach(stage => {
    window.pipelineManager.updateStage(stage, 'idle');
  });
  
  // Log initial truth snapshot
  window.pipelineManager.logPipelineTruthSnapshot();
  
  // Update stages from truth state
  window.pipelineManager.updateStageFromTruth();
  
  // Initialize WebRTC detection
  window.pipelineManager.initializeWebRTCDetection();
  
  // Set up periodic truth updates (every 5 seconds)
  setInterval(() => {
    window.pipelineManager.updateStageFromTruth();
  }, 5000);
  
  // Set up truth snapshot logging (every 30 seconds)
  setInterval(() => {
    window.pipelineManager.logPipelineTruthSnapshot();
  }, 30000);
  
  console.log('KELEDON Pipeline UI initialized with truth contract');
});

