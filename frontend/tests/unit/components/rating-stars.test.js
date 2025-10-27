/**
 * Unit test for RatingStars component (T099)
 * Tests interactive rating UI and keyboard accessibility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('RatingStars Component', () => {
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

  it('should render with initial rating of 0', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 0 });

    const starsContainer = container.querySelector('.rating-stars');
    expect(starsContainer).toBeTruthy();
    expect(starsContainer.dataset.rating).toBe('0');

    // All stars should be empty
    const emptyStars = container.querySelectorAll('.star.empty');
    expect(emptyStars.length).toBe(5);
  });

  it('should render with specified initial rating', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 3 });

    const starsContainer = container.querySelector('.rating-stars');
    expect(starsContainer.dataset.rating).toBe('3');

    // 3 stars should be filled
    const filledStars = container.querySelectorAll('.star.filled');
    expect(filledStars.length).toBe(3);

    // 2 stars should be empty
    const emptyStars = container.querySelectorAll('.star.empty');
    expect(emptyStars.length).toBe(2);
  });

  it('should render in readonly mode with span elements', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 4, readonly: true });

    const starsContainer = container.querySelector('.rating-stars');
    expect(starsContainer.classList.contains('readonly')).toBe(true);
    expect(starsContainer.getAttribute('role')).toBe('img');

    // Stars should be spans, not buttons
    const starSpans = container.querySelectorAll('.star');
    starSpans.forEach((star) => {
      expect(star.tagName).toBe('SPAN');
    });

    // Container should not be focusable
    expect(starsContainer.hasAttribute('tabindex')).toBe(false);
  });

  it('should render in interactive mode with button elements', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 0, readonly: false });

    const starsContainer = container.querySelector('.rating-stars');
    expect(starsContainer.classList.contains('interactive')).toBe(true);
    expect(starsContainer.getAttribute('role')).toBe('radiogroup');

    // Stars should be buttons
    const starButtons = container.querySelectorAll('.star');
    starButtons.forEach((star) => {
      expect(star.tagName).toBe('BUTTON');
    });

    // Container should be focusable
    expect(starsContainer.getAttribute('tabindex')).toBe('0');
  });

  it('should handle click on star to set rating', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 0, onChange });

    const stars = container.querySelectorAll('.star');

    // Click on 4th star
    stars[3].click();

    expect(onChange).toHaveBeenCalledWith(4);
    expect(ratingStars.getRating()).toBe(4);

    // 4 stars should now be filled
    const filledStars = container.querySelectorAll('.star.filled');
    expect(filledStars.length).toBe(4);
  });

  it('should update rating when clicking different star', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 3, onChange });

    const stars = container.querySelectorAll('.star');

    // Click on 5th star
    stars[4].click();

    expect(onChange).toHaveBeenCalledWith(5);
    expect(ratingStars.getRating()).toBe(5);
  });

  it('should not call onChange if rating is same', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 3, onChange });

    const stars = container.querySelectorAll('.star');

    // Click on 3rd star (current rating)
    stars[2].click();

    // onChange should not be called since rating didn't change
    expect(onChange).not.toHaveBeenCalled();
    expect(ratingStars.getRating()).toBe(3);
  });

  it('should support keyboard navigation with arrow keys', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 3, onChange });

    const starsContainer = container.querySelector('.rating-stars');

    // Press ArrowRight to increase rating
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(ratingStars.getRating()).toBe(4);

    // Press ArrowUp to increase rating again
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(onChange).toHaveBeenCalledWith(5);
    expect(ratingStars.getRating()).toBe(5);

    // Press ArrowLeft to decrease rating
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(ratingStars.getRating()).toBe(4);

    // Press ArrowDown to decrease rating again
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(onChange).toHaveBeenCalledWith(3);
    expect(ratingStars.getRating()).toBe(3);
  });

  it('should support keyboard navigation with number keys', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 0, onChange });

    const starsContainer = container.querySelector('.rating-stars');

    // Press '5' to set rating to 5
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
    expect(onChange).toHaveBeenCalledWith(5);
    expect(ratingStars.getRating()).toBe(5);

    // Press '1' to set rating to 1
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(onChange).toHaveBeenCalledWith(1);
    expect(ratingStars.getRating()).toBe(1);

    // Press '3' to set rating to 3
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    expect(onChange).toHaveBeenCalledWith(3);
    expect(ratingStars.getRating()).toBe(3);
  });

  it('should support Home and End keys', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 3, onChange });

    const starsContainer = container.querySelector('.rating-stars');

    // Press End to set rating to 5
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(onChange).toHaveBeenCalledWith(5);
    expect(ratingStars.getRating()).toBe(5);

    // Press Home to set rating to 1
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(onChange).toHaveBeenCalledWith(1);
    expect(ratingStars.getRating()).toBe(1);
  });

  it('should not go below 1 or above 5 with arrow keys', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 1, onChange });

    const starsContainer = container.querySelector('.rating-stars');

    // Try to go below 1
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(ratingStars.getRating()).toBe(1);

    // Set to 5
    ratingStars.setRating(5);
    onChange.mockClear();

    // Try to go above 5
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(ratingStars.getRating()).toBe(5);
  });

  it('should update ARIA label when rating changes', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 0 });

    const starsContainer = container.querySelector('.rating-stars');

    // Initial ARIA label
    expect(starsContainer.getAttribute('aria-label')).toContain('Select a rating');

    // Click on 3rd star
    const stars = container.querySelectorAll('.star');
    stars[2].click();

    // ARIA label should update
    expect(starsContainer.getAttribute('aria-label')).toBe('3 stars selected');
  });

  it('should create live region announcements', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 0 });

    const stars = container.querySelectorAll('.star');

    // Click on 4th star
    stars[3].click();

    // Check for live region announcement
    const announcement = container.querySelector('[role="status"][aria-live="polite"]');
    expect(announcement).toBeTruthy();
    expect(announcement.textContent).toBe('Rating: 4 out of 5 stars');
  });

  it('should handle hover events on stars', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 2 });

    const stars = container.querySelectorAll('.star');

    // Initially 2 stars filled
    expect(container.querySelectorAll('.star.filled').length).toBe(2);

    // Hover over 4th star
    stars[3].dispatchEvent(new MouseEvent('mouseenter'));

    // Should show 4 filled stars (hover state)
    expect(container.querySelectorAll('.star.filled').length).toBe(4);

    // Mouse leave from container
    const starsContainer = container.querySelector('.rating-stars');
    starsContainer.dispatchEvent(new MouseEvent('mouseleave'));

    // Should revert to original rating (2 stars)
    expect(container.querySelectorAll('.star.filled').length).toBe(2);
  });

  it('should not respond to events in readonly mode', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 3, readonly: true, onChange });

    const starsContainer = container.querySelector('.rating-stars');

    // Try keyboard navigation
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    // Rating should not change
    expect(onChange).not.toHaveBeenCalled();
    expect(ratingStars.getRating()).toBe(3);
  });

  it('should support different size options', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 3, size: 'large' });

    const starsContainer = container.querySelector('.rating-stars');
    expect(starsContainer.classList.contains('size-large')).toBe(true);
  });

  it('should have getRating method', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 4 });

    expect(ratingStars.getRating()).toBe(4);
  });

  it('should support setReadonly method', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 3, readonly: false });

    // Initially interactive
    let starsContainer = container.querySelector('.rating-stars');
    expect(starsContainer.classList.contains('interactive')).toBe(true);

    // Set to readonly
    ratingStars.setReadonly(true);

    // Should re-render as readonly
    starsContainer = container.querySelector('.rating-stars');
    expect(starsContainer.classList.contains('readonly')).toBe(true);
    expect(starsContainer.getAttribute('role')).toBe('img');
  });

  it('should support destroy method', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 3 });

    // Component should be rendered
    expect(container.querySelector('.rating-stars')).toBeTruthy();

    // Destroy the component
    ratingStars.destroy();

    // Container should be empty
    expect(container.innerHTML).toBe('');
  });

  it('should render correct star icons', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 3 });

    const stars = container.querySelectorAll('.star');

    // First 3 stars should be filled (★)
    expect(stars[0].textContent).toBe('★');
    expect(stars[1].textContent).toBe('★');
    expect(stars[2].textContent).toBe('★');

    // Last 2 stars should be empty (☆)
    expect(stars[3].textContent).toBe('☆');
    expect(stars[4].textContent).toBe('☆');
  });

  it('should have proper ARIA labels on individual stars', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 0 });

    const stars = container.querySelectorAll('.star');

    // Check ARIA labels
    expect(stars[0].getAttribute('aria-label')).toBe('1 star');
    expect(stars[1].getAttribute('aria-label')).toBe('2 stars');
    expect(stars[2].getAttribute('aria-label')).toBe('3 stars');
    expect(stars[3].getAttribute('aria-label')).toBe('4 stars');
    expect(stars[4].getAttribute('aria-label')).toBe('5 stars');
  });

  it('should default to medium size if not specified', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 3 });

    const starsContainer = container.querySelector('.rating-stars');
    expect(starsContainer.classList.contains('size-medium')).toBe(true);
  });

  it('should render 5 stars total', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 2 });

    const stars = container.querySelectorAll('.star');
    expect(stars.length).toBe(5);
  });

  it('should handle Enter key without changing rating', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 3, onChange });

    const starsContainer = container.querySelector('.rating-stars');

    // Press Enter
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    // Rating should not change, just announce
    expect(onChange).not.toHaveBeenCalled();
    expect(ratingStars.getRating()).toBe(3);
  });

  it('should handle Space key without changing rating', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 3, onChange });

    const starsContainer = container.querySelector('.rating-stars');

    // Press Space
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    // Rating should not change, just announce
    expect(onChange).not.toHaveBeenCalled();
    expect(ratingStars.getRating()).toBe(3);
  });

  it('should handle rating changes starting from 0', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 0, onChange });

    const starsContainer = container.querySelector('.rating-stars');

    // Press ArrowRight when rating is 0 (should start at 1, then increment to 2)
    starsContainer.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));

    // When rating is 0, currentRating defaults to 1, so ArrowRight should give us 2
    expect(ratingStars.getRating()).toBe(2);
  });

  it('should update stars correctly on setRating', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const ratingStars = new RatingStars(container, { rating: 2 });

    // Change rating programmatically
    ratingStars.setRating(4);

    expect(ratingStars.getRating()).toBe(4);

    const filledStars = container.querySelectorAll('.star.filled');
    expect(filledStars.length).toBe(4);
  });

  it('should ignore invalid rating in setRating', async () => {
    const { RatingStars } = await import('../../../src/scripts/components/rating-stars.js');

    const onChange = vi.fn();
    const ratingStars = new RatingStars(container, { rating: 3, onChange });

    // Try to set rating to 0
    ratingStars.setRating(0);
    expect(ratingStars.getRating()).toBe(3);

    // Try to set rating to 6
    ratingStars.setRating(6);
    expect(ratingStars.getRating()).toBe(3);

    // onChange should not have been called
    expect(onChange).not.toHaveBeenCalled();
  });
});
