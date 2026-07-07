const fs = require('fs');
const path = 'd:/xampp/htdocs/DeveloperEv/DEV-Frontend/src/pages/tools/planner-page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace 1: Insert isPlanImplemented calculation
const resultBlock = `  const [implementingType, setImplementingType] = useState<string | null>(null)`
const newResultBlock = `  const [implementingType, setImplementingType] = useState<string | null>(null)
  
  const isPlanImplemented = result?.tasks && result.tasks.length > 0 && result.tasks.every((t: any) => t.status === 'DONE');
  const effectivelyImplemented = implemented || isPlanImplemented;`
if(content.includes(resultBlock)) {
    content = content.replace(resultBlock, newResultBlock);
}

// Replace 2: Update the 'Saved Plan' button
const oldSavedPlanBtn = `{/* Implement Plan Button */}
                <button
                  onClick={() => handleAiImplementType(result.featureId, result.featureName || result.name || '', 'All')}
                  disabled={implementingType === 'All'}
                  className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/25 active:scale-95 disabled:opacity-50 h-[46px]"
                >
                  {implementingType === 'All' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {implementingType === 'All' ? 'Implementing Plan...' : 'Implement Plan with AI'}
                </button>`
const newSavedPlanBtn = `{/* Implement Plan Button */}
                <button
                  onClick={() => handleAiImplementType(result.featureId, result.featureName || result.name || '', 'All')}
                  disabled={implementingType === 'All' || effectivelyImplemented}
                  className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/25 active:scale-95 disabled:opacity-50 h-[46px]"
                >
                  {implementingType === 'All' ? <Loader2 className="w-4 h-4 animate-spin" /> : (effectivelyImplemented ? <CheckCircle2 className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />)}
                  {implementingType === 'All' ? 'Implementing Plan...' : (effectivelyImplemented ? 'Plan Implemented' : 'Implement Plan with AI')}
                </button>`
if(content.includes(oldSavedPlanBtn)) {
    content = content.replace(oldSavedPlanBtn, newSavedPlanBtn);
}

// Replace 3: Update the newly generated plan button
const oldNewPlanBtn = `              <button
                onClick={handleImplementPlan}
                disabled={implemented}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
              >
              {implemented
                ? <><CheckCircle2 className="w-4 h-4" /> Plan Implemented</>
                : <><Zap className="w-4 h-4" /> View in Project Board</>}
              </button>`
const newNewPlanBtn = `              <button
                onClick={handleImplementPlan}
                disabled={effectivelyImplemented}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
              >
              {effectivelyImplemented
                ? <><CheckCircle2 className="w-4 h-4" /> Plan Implemented</>
                : <><Zap className="w-4 h-4" /> View in Project Board</>}
              </button>`
if(content.includes(oldNewPlanBtn)) {
    content = content.replace(oldNewPlanBtn, newNewPlanBtn);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Success');
