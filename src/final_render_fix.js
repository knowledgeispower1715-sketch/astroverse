// Final quick-fix for rendering:
// Ensure the AstroCalendarContext is used for grid population
// even if data is in fallback mode.
window.astroCalendarContext.setState({
  viewMode: "3d",
  date: new Date().toISOString(),
});
// Trigger grid render
window.renderGrid();
