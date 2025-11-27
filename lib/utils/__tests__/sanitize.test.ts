import { describe, it, expect } from 'vitest';
import { sanitizeString, sanitizeEmail, sanitizeObject } from '../sanitize';

describe('sanitizeString', () => {
  it('should trim whitespace from strings', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString('\n\tworld\t\n')).toBe('world');
  });

  it('should escape HTML entities', () => {
    expect(sanitizeString('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    );
  });

  it('should escape ampersands', () => {
    expect(sanitizeString('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape less than and greater than signs', () => {
    expect(sanitizeString('5 < 10 > 3')).toBe('5 &lt; 10 &gt; 3');
  });

  it('should escape double quotes', () => {
    expect(sanitizeString('He said "hello"')).toBe('He said &quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(sanitizeString("It's working")).toBe('It&#x27;s working');
  });

  it('should handle empty strings', () => {
    expect(sanitizeString('')).toBe('');
  });

  it('should handle null and undefined', () => {
    expect(sanitizeString(null as any)).toBe(null);
    expect(sanitizeString(undefined as any)).toBe(undefined);
  });

  it('should handle multiple special characters', () => {
    const input = `<div class="test">It's "quoted" & 'escaped'</div>`;
    const expected = `&lt;div class=&quot;test&quot;&gt;It&#x27;s &quot;quoted&quot; &amp; &#x27;escaped&#x27;&lt;/div&gt;`;
    expect(sanitizeString(input)).toBe(expected);
  });

  it('should trim and escape together', () => {
    expect(sanitizeString('  <script>  ')).toBe('&lt;script&gt;');
  });
});

describe('sanitizeEmail', () => {
  it('should convert email to lowercase', () => {
    expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    expect(sanitizeEmail('User@Example.Com')).toBe('user@example.com');
  });

  it('should trim whitespace from email', () => {
    expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('should trim and lowercase together', () => {
    expect(sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
  });

  it('should handle empty strings', () => {
    expect(sanitizeEmail('')).toBe('');
  });

  it('should handle null and undefined', () => {
    expect(sanitizeEmail(null as any)).toBe(null);
    expect(sanitizeEmail(undefined as any)).toBe(undefined);
  });
});

describe('sanitizeObject', () => {
  it('should sanitize specified string fields', () => {
    const input = {
      title: '  <script>alert("XSS")</script>  ',
      author: 'John & Jane',
      count: 42,
    };

    const result = sanitizeObject(input, ['title', 'author']);

    expect(result.title).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    expect(result.author).toBe('John &amp; Jane');
    expect(result.count).toBe(42); // Non-string field unchanged
  });

  it('should not modify non-specified fields', () => {
    const input = {
      sanitize: '  <script>  ',
      dontSanitize: '  <script>  ',
    };

    const result = sanitizeObject(input, ['sanitize']);

    expect(result.sanitize).toBe('&lt;script&gt;');
    expect(result.dontSanitize).toBe('  <script>  ');
  });

  it('should handle objects with non-string fields', () => {
    const input = {
      name: '  Test  ',
      age: 25,
      active: true,
      scores: [1, 2, 3],
    };

    const result = sanitizeObject(input, ['name']);

    expect(result.name).toBe('Test');
    expect(result.age).toBe(25);
    expect(result.active).toBe(true);
    expect(result.scores).toEqual([1, 2, 3]);
  });

  it('should return a new object (not mutate original)', () => {
    const input = {
      title: '  <test>  ',
    };

    const result = sanitizeObject(input, ['title']);

    expect(result).not.toBe(input);
    expect(input.title).toBe('  <test>  '); // Original unchanged
    expect(result.title).toBe('&lt;test&gt;');
  });

  it('should handle empty field array', () => {
    const input = {
      title: '  <script>  ',
      author: '  test  ',
    };

    const result = sanitizeObject(input, []);

    expect(result.title).toBe('  <script>  ');
    expect(result.author).toBe('  test  ');
  });

  it('should handle fields that do not exist in object', () => {
    const input = {
      title: '  test  ',
    };

    const result = sanitizeObject(input, ['title', 'author' as any]);

    expect(result.title).toBe('test');
    expect((result as any).author).toBeUndefined();
  });

  it('should sanitize array of string fields', () => {
    const input = {
      genres: ['  Fantasy  ', '<script>Horror</script>', "Sci-Fi & Mystery"],
      title: 'Book',
    };

    // Note: This function only sanitizes direct string properties, not arrays
    // Arrays would need to be handled separately in route handlers
    const result = sanitizeObject(input, ['title']);

    expect(result.title).toBe('Book');
    expect(result.genres).toEqual(['  Fantasy  ', '<script>Horror</script>', "Sci-Fi & Mystery"]);
  });
});