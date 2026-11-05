
// v2 capture: keep references to original functions before overrides hoist
window._ssOrig = {
    prepare: prepareStageEntities,
    trigger: triggerActiveStageAnimation,
    draw: drawStageFrame,
    cardSVG: getModeCardSVG,
    renderAll: renderAllDashboard,
    addQuick: addQuickBlankSentences,
    resetDef: resetToDefaultQuestions,
    showWinner: showWinnerPopup,
    renderMystery: renderInteractiveMysteryBoxes,
    openBox: openSpecificMysteryBox
};

