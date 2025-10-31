/**
 * GoalsPage - Reading Goals Management Page (T055, T057, T059, T062, T063)
 * Displays active, completed, and expired goals with create/edit functionality
 */

import { GoalCard } from '../components/goal-card.js';
import { GoalForm } from '../components/goal-form.js';
import * as goalsApi from '../api/goals-api.js';

// Page state
let activeGoals = [];
let completedGoals = [];
let expiredGoals = [];
let isLoading = false;
let error = null;
let currentPage = 0;
const PAGE_SIZE = 20;

// Component instances
let goalForm = null;
let editingGoal = null;

/**
 * Initialize the goals page (T055)
 */
export async function initGoalsPage() {
  // Show loading state (T062)
  showLoading(true);

  // Initialize components
  initComponents();

  // Load initial data
  await loadGoals();

  // Hide loading
  showLoading(false);
}

/**
 * Initialize page components
 */
function initComponents() {
  // Create goal button
  const createBtn = document.getElementById('create-goal-btn');
  if (createBtn) {
    createBtn.addEventListener('click', handleCreateGoal);
  }

  // Initialize form container (hidden by default)
  const formContainer = document.getElementById('goal-form-container');
  if (formContainer) {
    formContainer.style.display = 'none';
  }

  // Refresh button
  const refreshBtn = document.getElementById('refresh-goals-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadGoals();
    });
  }
}

/**
 * Load goals from API (T055)
 */
async function loadGoals() {
  showLoading(true);
  clearError();

  try {
    // Fetch all goals (no status filter to get all at once)
    const response = await goalsApi.listGoals({
      limit: PAGE_SIZE * 3, // Get enough for all sections
      offset: currentPage * PAGE_SIZE,
    });

    // Sort goals into categories
    activeGoals = [];
    completedGoals = [];
    expiredGoals = [];

    if (response.goals) {
      response.goals.forEach((goal) => {
        if (goal.status === 'active') {
          activeGoals.push(goal);
        } else if (goal.status === 'completed') {
          completedGoals.push(goal);
        } else if (goal.status === 'expired') {
          expiredGoals.push(goal);
        }
      });
    }

    // Render sections
    renderGoalSections();
  } catch (err) {
    // Error handling (T063)
    showError(err.message || 'Failed to load goals. Please try again.');
    console.error('Failed to load goals:', err);
  } finally {
    showLoading(false);
  }
}

/**
 * Render goal sections (T055)
 */
function renderGoalSections() {
  renderActiveSection();
  renderCompletedSection();
  renderExpiredSection();
}

/**
 * Render active goals section (T055, T057)
 */
function renderActiveSection() {
  const container = document.getElementById('active-goals-list');
  if (!container) return;

  container.innerHTML = '';

  if (activeGoals.length === 0) {
    // Empty state (T057)
    container.innerHTML = `
      <div class="goals-empty-state">
        <div class="empty-state-icon">🎯</div>
        <p class="empty-state-message">No active goals - create your first!</p>
        <button class="btn btn-primary" onclick="document.getElementById('create-goal-btn').click()">
          Create Your First Goal
        </button>
      </div>
    `;
  } else {
    // Render goal cards
    activeGoals.forEach((goal) => {
      const cardContainer = document.createElement('div');
      cardContainer.className = 'goal-card-wrapper';
      container.appendChild(cardContainer);

      new GoalCard(cardContainer, {
        goal,
        onEdit: handleEditGoal,
        onDelete: handleDeleteGoal,
        onClick: handleGoalClick,
        showActions: true,
      });
    });
  }

  // Update count
  updateSectionCount('active', activeGoals.length);
}

/**
 * Render completed goals section (T055, T057)
 */
function renderCompletedSection() {
  const container = document.getElementById('completed-goals-list');
  if (!container) return;

  container.innerHTML = '';

  if (completedGoals.length === 0) {
    // Empty state (T057)
    container.innerHTML = `
      <div class="goals-empty-state">
        <p class="empty-state-message">No completed goals yet. Keep reading!</p>
      </div>
    `;
  } else {
    // Render goal cards
    completedGoals.forEach((goal) => {
      const cardContainer = document.createElement('div');
      cardContainer.className = 'goal-card-wrapper';
      container.appendChild(cardContainer);

      new GoalCard(cardContainer, {
        goal,
        onDelete: handleDeleteGoal,
        onClick: handleGoalClick,
        showActions: true,
      });
    });
  }

  // Update count
  updateSectionCount('completed', completedGoals.length);
}

/**
 * Render expired goals section (T055, T057)
 */
function renderExpiredSection() {
  const container = document.getElementById('expired-goals-list');
  if (!container) return;

  container.innerHTML = '';

  if (expiredGoals.length === 0) {
    // Empty state (T057)
    container.innerHTML = `
      <div class="goals-empty-state">
        <p class="empty-state-message">No expired goals.</p>
      </div>
    `;
  } else {
    // Render goal cards
    expiredGoals.forEach((goal) => {
      const cardContainer = document.createElement('div');
      cardContainer.className = 'goal-card-wrapper';
      container.appendChild(cardContainer);

      new GoalCard(cardContainer, {
        goal,
        onDelete: handleDeleteGoal,
        onClick: handleGoalClick,
        showActions: true,
      });
    });
  }

  // Update count
  updateSectionCount('expired', expiredGoals.length);
}

/**
 * Update section count badge
 */
function updateSectionCount(section, count) {
  const countElement = document.getElementById(`${section}-goals-count`);
  if (countElement) {
    countElement.textContent = count;
  }
}

/**
 * Handle create goal button click
 */
function handleCreateGoal() {
  editingGoal = null;
  showGoalForm('create');
}

/**
 * Handle edit goal
 */
function handleEditGoal(goal) {
  editingGoal = goal;
  showGoalForm('edit', goal);
}

/**
 * Handle delete goal
 */
async function handleDeleteGoal(goal) {
  try {
    await goalsApi.deleteGoal(goal.id);

    // Reload goals
    await loadGoals();

    // Show success message (could add toast notification here)
    console.log(`Goal "${goal.name}" deleted successfully`);
  } catch (err) {
    showError(`Failed to delete goal: ${err.message}`);
    console.error('Failed to delete goal:', err);
  }
}

/**
 * Handle goal card click
 */
function handleGoalClick(goal) {
  // Navigate to goal detail view (future enhancement)
  console.log('Goal clicked:', goal);
}

/**
 * Show goal form (T055)
 */
function showGoalForm(mode, goal = null) {
  const formContainer = document.getElementById('goal-form-container');
  if (!formContainer) return;

  // Create form instance
  goalForm = new GoalForm({
    container: formContainer,
    mode,
    goal,
    onSubmit: handleGoalSubmit,
    onCancel: hideGoalForm,
  });

  // Show form
  formContainer.style.display = 'block';
  goalForm.render();

  // Scroll to form
  formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Focus first input
  setTimeout(() => {
    const firstInput = formContainer.querySelector('input');
    if (firstInput) {
      firstInput.focus();
    }
  }, 100);
}

/**
 * Hide goal form
 */
function hideGoalForm() {
  const formContainer = document.getElementById('goal-form-container');
  if (formContainer) {
    formContainer.style.display = 'none';
  }

  if (goalForm) {
    goalForm.destroy();
    goalForm = null;
  }

  editingGoal = null;
}

/**
 * Handle goal form submission
 */
async function handleGoalSubmit(goalData) {
  try {
    if (editingGoal) {
      // Update existing goal
      await goalsApi.updateGoal(editingGoal.id, goalData);
    } else {
      // Create new goal
      await goalsApi.createGoal(goalData);
    }

    // Hide form
    hideGoalForm();

    // Reload goals
    await loadGoals();

    // Show success message
    console.log(`Goal ${editingGoal ? 'updated' : 'created'} successfully`);
  } catch (err) {
    // Let form handle the error display
    throw err;
  }
}

/**
 * Show loading state (T062)
 */
function showLoading(loading) {
  isLoading = loading;

  const loadingElement = document.getElementById('goals-loading');
  const contentElement = document.getElementById('goals-content');

  if (loadingElement) {
    loadingElement.style.display = loading ? 'block' : 'none';
  }

  if (contentElement) {
    contentElement.style.opacity = loading ? '0.5' : '1';
    contentElement.style.pointerEvents = loading ? 'none' : 'auto';
  }

  // Update button states
  const createBtn = document.getElementById('create-goal-btn');
  const refreshBtn = document.getElementById('refresh-goals-btn');

  if (createBtn) {
    createBtn.disabled = loading;
  }

  if (refreshBtn) {
    refreshBtn.disabled = loading;
    refreshBtn.textContent = loading ? 'Loading...' : 'Refresh';
  }
}

/**
 * Show error state (T063)
 */
function showError(message) {
  error = message;

  const errorElement = document.getElementById('goals-error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    errorElement.setAttribute('role', 'alert');

    // Auto-hide after 5 seconds
    setTimeout(() => {
      clearError();
    }, 5000);
  }
}

/**
 * Clear error state (T063)
 */
function clearError() {
  error = null;

  const errorElement = document.getElementById('goals-error');
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }
}

/**
 * Load more goals (pagination) (T059)
 */
export async function loadMoreGoals() {
  if (isLoading) return;

  currentPage++;
  await loadGoals();
}

/**
 * Reset pagination and reload
 */
export async function refreshGoals() {
  currentPage = 0;
  await loadGoals();
}

// Export for use in HTML or other modules
export { handleCreateGoal, handleEditGoal, handleDeleteGoal };
