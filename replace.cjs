const fs = require('fs');
const path = 'd:/xampp/htdocs/DeveloperEv/DEV-Frontend/src/pages/tools/planner-page.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldBlock = `    try {
      const response = await apiClient.post<PlanResult>('/ai/project-plan', {
        featureDescription: feature,
        projectId: selectedProject.id,
      }, { signal: controller.signal })

      const data = response.data

      // ── Smart Pre-flight Dialog ──────────────────────────────────────────────
      // If the AI detected the feature is partially done or already exists,
      // show a friendly dialog before committing the plan.
      if (data.analysisStatus === 'PARTIAL' || data.analysisStatus === 'EXISTS') {
        const statusLabel = data.analysisStatus === 'EXISTS' ? '✅ Already Implemented' : '🔧 Partially Implemented'
        const statusColor = data.analysisStatus === 'EXISTS' ? '#22c55e' : '#f59e0b'
        const confirmText = data.analysisStatus === 'EXISTS'
          ? 'View Improvement Plan'
          : 'Continue from Here'

        const preflightResult = await Swal.fire({
          title: statusLabel,
          html: \`
            <div style="text-align:left;padding:4px 0">
              <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px 16px;margin-bottom:16px">
                <p style="color:#d4d4d8;font-size:14px;line-height:1.7;margin:0">\${data.suggestion || 'The AI analyzed your existing codebase and found relevant code.'}</p>
              </div>
              <p style="color:#71717a;font-size:13px;margin:0">How would you like to proceed?</p>
            </div>
          \`,
          background: 'rgba(15,15,20,0.97)',
          color: '#fff',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: confirmText,
          denyButtonText: '🔄 Build from Scratch',
          cancelButtonText: 'Cancel',
          confirmButtonColor: statusColor,
          denyButtonColor: '#6366f1',
          cancelButtonColor: '#3f3f46',
          backdrop: 'rgba(0,0,0,0.6) blur(6px)',
          customClass: { popup: 'swal-preflight-popup' },
          reverseButtons: false,
        })

        if (preflightResult.isDismissed) {
          // User cancelled — delete the saved plan on the backend so it doesn't persist
          try {
            await apiClient.delete(\`/features/\${data.featureId}\`)
            queryClient.invalidateQueries({ queryKey: ['projectPlans', selectedProject?.id] })
          } catch (e) {
            console.error("Failed to clean up cancelled plan:", e)
          }
          return
        }

        if (preflightResult.isDenied) {
          // Build from scratch — strip analysisStatus so it renders as fresh
          data.analysisStatus = 'FRESH'
          data.suggestion = undefined
        }
        // If confirmed — proceed with the partial/exists plan as-is
      }`;

const newBlock = `    try {
      // STEP 1: PRE-CHECK FEATURE
      const precheckResponse = await apiClient.post<{analysisStatus: string, suggestion: string}>('/ai/precheck-feature', {
        featureDescription: feature,
        projectId: selectedProject.id,
      }, { signal: controller.signal })

      let finalIntent = ''

      if (precheckResponse.data.analysisStatus === 'PARTIAL' || precheckResponse.data.analysisStatus === 'EXISTS') {
        const statusLabel = precheckResponse.data.analysisStatus === 'EXISTS' ? '✅ Already Implemented' : '🔧 Partially Implemented'
        const statusColor = precheckResponse.data.analysisStatus === 'EXISTS' ? '#22c55e' : '#f59e0b'
        const confirmText = precheckResponse.data.analysisStatus === 'EXISTS'
          ? 'View Improvement Plan'
          : 'Continue from Here'

        const preflightResult = await Swal.fire({
          title: statusLabel,
          html: \`
            <div style="text-align:left;padding:4px 0">
              <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px 16px;margin-bottom:16px">
                <p style="color:#d4d4d8;font-size:14px;line-height:1.7;margin:0">\${precheckResponse.data.suggestion || 'The AI analyzed your existing codebase and found relevant code.'}</p>
              </div>
              <p style="color:#71717a;font-size:13px;margin:0">How would you like to proceed?</p>
            </div>
          \`,
          background: 'rgba(15,15,20,0.97)',
          color: '#fff',
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: confirmText,
          denyButtonText: '🔄 Build from Scratch',
          cancelButtonText: 'Cancel',
          confirmButtonColor: statusColor,
          denyButtonColor: '#6366f1',
          cancelButtonColor: '#3f3f46',
          backdrop: 'rgba(0,0,0,0.6) blur(6px)',
          customClass: { popup: 'swal-preflight-popup' },
          reverseButtons: false,
        })

        if (preflightResult.isDismissed) {
          setLoading(false)
          return
        }

        if (preflightResult.isDenied) {
          finalIntent = "IGNORE EXISTING CODE. Build entirely from scratch as if it was FRESH."
        }
      }

      // STEP 2: GENERATE FULL PLAN
      const finalDescription = finalIntent ? feature + "\\n\\nCRITICAL USER INSTRUCTION: " + finalIntent : feature

      const response = await apiClient.post<PlanResult>('/ai/project-plan', {
        featureDescription: finalDescription,
        projectId: selectedProject.id,
      }, { signal: controller.signal })

      const data = response.data
      
      if (finalIntent) {
        data.analysisStatus = 'FRESH'
        data.suggestion = undefined
      }`;

if (content.includes(oldBlock)) {
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Success');
} else {
    console.log('Block not found');
}
