/**
 * AstroCalendarContext.js
 *
 * Manages the global state for the AstroVerse application.
 * Replaces disjointed variables and localStorage usage.
 */
import ApiClient from "./ApiClient.js";

class AstroCalendarContext {
  constructor() {
    this.api = new ApiClient();
    this.state = {
      viewMode: "3d", // '3d' or '2d'
      date: new Date().toISOString(),
      location: { lat: 28.6139, lon: 77.209, name: "New Delhi, Delhi, India" },
      convention: "Purnimanta", // 'Purnimanta' or 'Amanta'
      selectedRashi: null,
      filters: {
        panchang: [],
        muhurat: [],
      },
      expandedDashaLord: null,
      expandedAntarKey: null,
    };
    this.listeners = [];
    this.loadFromLocalStorage();
  }

  getState() {
    return this.state;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  saveToLocalStorage() {
    localStorage.setItem("astroCalendarState", JSON.stringify(this.state));
  }

  loadFromLocalStorage() {
    const saved = localStorage.getItem("astroCalendarState");
    if (saved) {
      try {
        this.state = { ...this.state, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to load state from localStorage", e);
      }
    }
  }
}

export const astroCalendarContext = new AstroCalendarContext();
export default AstroCalendarContext;
