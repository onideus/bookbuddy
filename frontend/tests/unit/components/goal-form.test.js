/**
 * Unit test for GoalForm component (T041)
 * Tests form validation, input handling, and create/edit modes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('GoalForm Component', () => {
  let container;

  beforeEach(() => {
    // Create a container for the component
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    document.body.removeChild(container);
  });

  describe('Create Mode Rendering', () => {
    it('should render create mode form with all fields', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const onSubmit = vi.fn();
      const goalForm = new GoalForm({
        container,
        onSubmit,
        mode: 'create',
      });

      goalForm.render();

      // Check form title
      const title = container.querySelector('.form-title');
      expect(title.textContent).toBe('Create Reading Goal');

      // Check required fields exist
      expect(container.querySelector('#goal-name')).toBeTruthy();
      expect(container.querySelector('#goal-target')).toBeTruthy();
      expect(container.querySelector('#goal-days')).toBeTruthy();

      // Check submit button
      const submitBtn = container.querySelector('button[type="submit"]');
      expect(submitBtn.textContent.trim()).toBe('Create Goal');
    });

    it('should have proper ARIA attributes on inputs', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const goalForm = new GoalForm({
        container,
        onSubmit: vi.fn(),
        mode: 'create',
      });

      goalForm.render();

      const nameInput = container.querySelector('#goal-name');
      expect(nameInput.getAttribute('aria-required')).toBe('true');
      expect(nameInput.getAttribute('aria-describedby')).toContain('name-error');

      const targetInput = container.querySelector('#goal-target');
      expect(targetInput.getAttribute('aria-required')).toBe('true');
      expect(targetInput.getAttribute('aria-describedby')).toContain('target-error');
    });
  });

  describe('Edit Mode Rendering', () => {
    it('should render edit mode form with existing goal data', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const existingGoal = {
        id: '123',
        name: 'Summer Reading',
        targetCount: 15,
        progressCount: 5,
        status: 'active',
      };

      const onSubmit = vi.fn();
      const goalForm = new GoalForm({
        container,
        onSubmit,
        goal: existingGoal,
        mode: 'edit',
      });

      goalForm.render();

      // Check form title
      const title = container.querySelector('.form-title');
      expect(title.textContent).toBe('Edit Reading Goal');

      // Check fields are populated
      const nameInput = container.querySelector('#goal-name');
      expect(nameInput.value).toBe('Summer Reading');

      const targetInput = container.querySelector('#goal-target');
      expect(targetInput.value).toBe('15');

      // Should not have daysFromNow field in edit mode
      expect(container.querySelector('#goal-days')).toBeFalsy();

      // Should have daysToAdd field instead
      expect(container.querySelector('#goal-extend')).toBeTruthy();

      // Check submit button
      const submitBtn = container.querySelector('button[type="submit"]');
      expect(submitBtn.textContent.trim()).toBe('Update Goal');
    });
  });

  describe('Form Validation (T041)', () => {
    it('should validate required fields', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const onSubmit = vi.fn();
      const goalForm = new GoalForm({
        container,
        onSubmit,
        mode: 'create',
      });

      goalForm.render();

      // Try to submit empty form
      const form = container.querySelector('#goal-form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Check that validation failed and onSubmit was not called
      expect(onSubmit).not.toHaveBeenCalled();

      // Check error messages appear
      const nameError = container.querySelector('#name-error');
      expect(nameError.textContent).toContain('required');

      const targetError = container.querySelector('#target-error');
      expect(targetError.textContent).toContain('required');

      const daysError = container.querySelector('#days-error');
      expect(daysError.textContent).toContain('required');
    });

    it('should validate name length (max 255 characters)', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const goalForm = new GoalForm({
        container,
        onSubmit: vi.fn(),
        mode: 'create',
      });

      goalForm.render();

      const nameInput = container.querySelector('#goal-name');
      nameInput.value = 'a'.repeat(256);

      const isValid = goalForm.validateField(nameInput);

      expect(isValid).toBe(false);
      const nameError = container.querySelector('#name-error');
      expect(nameError.textContent).toContain('255 characters or less');
    });

    it('should validate target count is positive integer', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const goalForm = new GoalForm({
        container,
        onSubmit: vi.fn(),
        mode: 'create',
      });

      goalForm.render();

      const targetInput = container.querySelector('#goal-target');

      // Test negative number
      targetInput.value = '-5';
      let isValid = goalForm.validateField(targetInput);
      expect(isValid).toBe(false);

      // Test zero
      targetInput.value = '0';
      isValid = goalForm.validateField(targetInput);
      expect(isValid).toBe(false);

      // Test valid positive
      targetInput.value = '10';
      isValid = goalForm.validateField(targetInput);
      expect(isValid).toBe(true);
    });

    it('should validate target count range (1-9999)', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const goalForm = new GoalForm({
        container,
        onSubmit: vi.fn(),
        mode: 'create',
      });

      goalForm.render();

      const targetInput = container.querySelector('#goal-target');

      // Test too large
      targetInput.value = '10000';
      let isValid = goalForm.validateField(targetInput);
      expect(isValid).toBe(false);

      // Test at max
      targetInput.value = '9999';
      isValid = goalForm.validateField(targetInput);
      expect(isValid).toBe(true);

      // Test at min
      targetInput.value = '1';
      isValid = goalForm.validateField(targetInput);
      expect(isValid).toBe(true);
    });

    it('should validate days from now range (1-3650)', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const goalForm = new GoalForm({
        container,
        onSubmit: vi.fn(),
        mode: 'create',
      });

      goalForm.render();

      const daysInput = container.querySelector('#goal-days');

      // Test too large
      daysInput.value = '3651';
      let isValid = goalForm.validateField(daysInput);
      expect(isValid).toBe(false);

      // Test at max
      daysInput.value = '3650';
      isValid = goalForm.validateField(daysInput);
      expect(isValid).toBe(true);

      // Test at min
      daysInput.value = '1';
      isValid = goalForm.validateField(daysInput);
      expect(isValid).toBe(true);
    });

    it('should set aria-invalid on invalid fields', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const goalForm = new GoalForm({
        container,
        onSubmit: vi.fn(),
        mode: 'create',
      });

      goalForm.render();

      const nameInput = container.querySelector('#goal-name');
      nameInput.value = '';

      goalForm.validateField(nameInput);

      expect(nameInput.getAttribute('aria-invalid')).toBe('true');
    });

    it('should clear aria-invalid on valid fields', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const goalForm = new GoalForm({
        container,
        onSubmit: vi.fn(),
        mode: 'create',
      });

      goalForm.render();

      const nameInput = container.querySelector('#goal-name');
      nameInput.value = 'Valid Goal Name';

      goalForm.validateField(nameInput);

      expect(nameInput.hasAttribute('aria-invalid')).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct data in create mode', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const goalForm = new GoalForm({
        container,
        onSubmit,
        mode: 'create',
      });

      goalForm.render();

      // Fill in form
      container.querySelector('#goal-name').value = 'Summer Reading';
      container.querySelector('#goal-target').value = '20';
      container.querySelector('#goal-days').value = '60';

      // Submit form
      const form = container.querySelector('#goal-form');
      await form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Summer Reading',
        targetCount: 20,
        daysFromNow: 60,
      });
    });

    it('should call onSubmit with correct data in edit mode', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const existingGoal = {
        id: '123',
        name: 'Summer Reading',
        targetCount: 15,
      };

      const goalForm = new GoalForm({
        container,
        onSubmit,
        goal: existingGoal,
        mode: 'edit',
      });

      goalForm.render();

      // Update form
      container.querySelector('#goal-name').value = 'Updated Goal Name';
      container.querySelector('#goal-target').value = '25';
      container.querySelector('#goal-extend').value = '14';

      // Submit form
      const form = container.querySelector('#goal-form');
      await form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Updated Goal Name',
        targetCount: 25,
        daysToAdd: 14,
      });
    });

    it('should not include daysToAdd if field is empty in edit mode', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const existingGoal = {
        id: '123',
        name: 'Summer Reading',
        targetCount: 15,
      };

      const goalForm = new GoalForm({
        container,
        onSubmit,
        goal: existingGoal,
        mode: 'edit',
      });

      goalForm.render();

      // Update only name
      container.querySelector('#goal-name').value = 'New Name';
      // Leave daysToAdd empty

      // Submit form
      const form = container.querySelector('#goal-form');
      await form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      const callArg = onSubmit.mock.calls[0][0];
      expect(callArg).toEqual({
        name: 'New Name',
        targetCount: 15,
      });
      expect(callArg.daysToAdd).toBeUndefined();
    });

    it('should trim whitespace from name', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const goalForm = new GoalForm({
        container,
        onSubmit,
        mode: 'create',
      });

      goalForm.render();

      // Fill in form with whitespace
      container.querySelector('#goal-name').value = '  Summer Reading  ';
      container.querySelector('#goal-target').value = '20';
      container.querySelector('#goal-days').value = '60';

      // Submit form
      const form = container.querySelector('#goal-form');
      await form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Summer Reading',
        })
      );
    });
  });

  describe('Cancel Button', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const onCancel = vi.fn();
      const goalForm = new GoalForm({
        container,
        onSubmit: vi.fn(),
        onCancel,
        mode: 'create',
      });

      goalForm.render();

      const cancelBtn = container.querySelector('#cancel-btn');
      cancelBtn.click();

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show general error when onSubmit fails', async () => {
      const { GoalForm } = await import('../../../src/scripts/components/goal-form.js');

      const onSubmit = vi.fn().mockRejectedValue(new Error('Server error'));
      const goalForm = new GoalForm({
        container,
        onSubmit,
        mode: 'create',
      });

      goalForm.render();

      // Fill in valid data
      container.querySelector('#goal-name').value = 'Summer Reading';
      container.querySelector('#goal-target').value = '20';
      container.querySelector('#goal-days').value = '60';

      // Submit form
      const form = container.querySelector('#goal-form');
      await form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      const generalError = container.querySelector('#form-general-error');
      expect(generalError.textContent).toContain('Server error');
    });
  });
});
