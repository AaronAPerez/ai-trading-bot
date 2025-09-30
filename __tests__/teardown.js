/**
 * Global Test Teardown
 * Ensures proper cleanup of resources to prevent memory leaks
 * Save as: __tests__/teardown.js
 */

module.exports = async () => {
  console.log('Running global test teardown...')
  
  // Clear all timers
  if (global.clearAllTimers) {
    global.clearAllTimers()
  }
  
  // Close any remaining HTTP connections
  if (global.agent) {
    global.agent.destroy()
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
  
  // Wait for cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 500))
  
  console.log('Global test teardown completed')
}