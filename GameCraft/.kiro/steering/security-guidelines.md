# Security Guidelines for Craftus Development

## Quick Security Checklist

Use this checklist when adding new features or modifying existing code.

### Input Handling ✅
- [ ] All user input is validated using `validatePrompt()` or similar
- [ ] All text output is sanitized using `sanitizeText()`
- [ ] All image URLs are validated using `sanitizeImageUrl()`
- [ ] Input length limits are enforced (prompts: 10-500 chars)
- [ ] Suspicious patterns are detected and rejected

### Data Storage 🗄️
- [ ] LocalStorage data is validated before use
- [ ] Size limits are enforced (5MB max)
- [ ] Array lengths are limited (projects: 100, nodes: 50, edges: 100)
- [ ] Data structure is validated with `validateProjectData()`
- [ ] Sensitive data is never stored in LocalStorage

### API Calls 🌐
- [ ] Rate limiting is applied before API calls
- [ ] Errors are sanitized before displaying to users
- [ ] API responses are validated before use
- [ ] Retry logic includes exponential backoff
- [ ] API keys are never logged or exposed

### Component Rendering 🎨
- [ ] User-generated content is sanitized before rendering
- [ ] Image sources are validated
- [ ] Event handlers don't execute user-provided code
- [ ] No `dangerouslySetInnerHTML` is used
- [ ] TypeScript types are properly defined (no `any`)

### Error Handling ⚠️
- [ ] Errors don't expose sensitive information
- [ ] Stack traces are not shown in production
- [ ] User-friendly error messages are displayed
- [ ] Errors are logged for debugging (without sensitive data)
- [ ] Failed operations have retry mechanisms

## Common Security Patterns

### Sanitizing User Input
```typescript
import { sanitizeText } from '../utils/security';

// Always sanitize before rendering
<h3>{sanitizeText(project.name, 100)}</h3>

// Always sanitize before storing
const cleanName = sanitizeText(userInput, 200);
saveProject({ ...project, name: cleanName });
```

### Validating Prompts
```typescript
import { validatePrompt } from '../utils/validation';

const handleSubmit = () => {
  const validation = validatePrompt(prompt);
  if (!validation.valid) {
    setError(validation.error);
    return;
  }
  
  // Proceed with generation
  onGenerate(sanitizeText(prompt), category);
};
```

### Validating Image URLs
```typescript
import { sanitizeImageUrl } from '../utils/security';

<img
  src={sanitizeImageUrl(imageUrl) || '/placeholder.png'}
  alt={sanitizeText(altText, 100)}
  onError={(e) => {
    e.currentTarget.src = '/placeholder.png';
  }}
/>
```

### Rate Limiting API Calls
```typescript
import { apiRateLimiter } from '../utils/rateLimiter';

export const generateImage = async (prompt: string) => {
  if (!apiRateLimiter.canMakeRequest()) {
    const waitTime = apiRateLimiter.getTimeUntilNextRequest();
    throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)}s.`);
  }
  
  // Make API call
  return await api.generate(prompt);
};
```

### Validating LocalStorage Data
```typescript
import { validateProjectData } from '../utils/security';

const loadProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem('projects');
    if (!stored) return [];
    
    // Size check
    if (stored.length > 5 * 1024 * 1024) {
      console.error('Storage data too large');
      return [];
    }
    
    const parsed = JSON.parse(stored);
    
    // Validate each project
    return parsed
      .filter((p: any) => validateProjectData(p))
      .slice(0, 100);
      
  } catch (error) {
    console.error('Failed to load projects:', error);
    localStorage.removeItem('projects');
    return [];
  }
};
```

## Security Anti-Patterns to Avoid

### ❌ DON'T: Render unsanitized user input
```typescript
// BAD
<div>{project.name}</div>

// GOOD
<div>{sanitizeText(project.name, 100)}</div>
```

### ❌ DON'T: Use `any` types
```typescript
// BAD
const handleClick = (e: any) => { ... }

// GOOD
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... }
```

### ❌ DON'T: Trust LocalStorage data
```typescript
// BAD
const project = JSON.parse(localStorage.getItem('project'));
useProject(project);

// GOOD
const stored = localStorage.getItem('project');
if (stored && validateProjectData(JSON.parse(stored))) {
  useProject(JSON.parse(stored));
}
```

### ❌ DON'T: Expose detailed errors
```typescript
// BAD
catch (error) {
  alert(error.message); // May contain sensitive info
}

// GOOD
catch (error) {
  alert('An error occurred. Please try again.');
  console.error('Generation error:', error); // Log for debugging
}
```

### ❌ DON'T: Allow unlimited API calls
```typescript
// BAD
const generate = async () => {
  return await api.generate(prompt);
}

// GOOD
const generate = async () => {
  if (!rateLimiter.canMakeRequest()) {
    throw new Error('Rate limit exceeded');
  }
  return await api.generate(prompt);
}
```

## Known Limitations (MVP Phase)

These are documented security limitations that will be addressed when backend is implemented:

1. **API Key Exposure**: Gemini API key is in client bundle (requires backend proxy)
2. **No Authentication**: Anyone can use the application (requires auth system)
3. **Client-Side Rate Limiting**: Can be bypassed (requires server-side enforcement)
4. **LocalStorage Only**: No cloud backup or sync (requires database)
5. **No Audit Logging**: Security events not tracked (requires logging infrastructure)

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://react.dev/learn/security)
- [TypeScript Security](https://www.typescriptlang.org/docs/handbook/security.html)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email the security team immediately
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and provide a timeline for fixes.
