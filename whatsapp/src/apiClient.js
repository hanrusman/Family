class ApiClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async fetch(path, options = {}) {
    const url = `${this.baseUrl}/api${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getEvents(date) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const end = nextDay.toISOString().split('T')[0];
    return this.fetch(`/tablet/events?start=${date}&end=${end}`);
  }

  async createEvent(event) {
    return this.fetch('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async getChores(date) {
    return this.fetch(`/tablet/chores?date=${date}`);
  }

  async getMeals(date) {
    return this.fetch(`/tablet/meals?date=${date}`);
  }

  async addShoppingItems(items) {
    return this.fetch('/shopping/bulk', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async getShoppingList() {
    return this.fetch('/tablet/shopping');
  }

  async setMeal(meal) {
    return this.fetch('/meals', {
      method: 'POST',
      body: JSON.stringify(meal),
    });
  }
}

module.exports = { ApiClient };
