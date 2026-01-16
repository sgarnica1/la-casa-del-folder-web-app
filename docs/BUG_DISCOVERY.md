# Bug Discovery Testing Checklist

This document outlines comprehensive testing scenarios to ensure the MVP is robust and handles edge cases gracefully.

## Reload Tests

Test data persistence by reloading the page at each stage of the flow:

### After Upload
1. Upload some images
2. Reload the page
3. **Expected:** Images should persist and be visible
4. **If they don't persist:** Either fix persistence or show clear message that uploaded images are temporary

### After Partial Assignment
1. Upload images
2. Assign some images to slots (not all)
3. Reload the page
4. **Expected:** Both uploaded images and slot assignments should persist
5. **If not:** Verify draft updates are saved correctly

### After Preview
1. Complete image assignments
2. Go to preview page
3. Reload the page
4. **Expected:** Preview should show all assigned images correctly
5. **Verify:** Draft status should remain as 'draft'

### After Lock
1. Lock a draft
2. Reload the page
3. **Expected:** Draft status should be 'locked', editing should be disabled
4. **Verify:** Locked draft cannot be edited

## Concurrency Tests

Test what happens when multiple tabs/windows access the same resource:

### Tab Conflict - Draft Editing
1. Open the same draft in two browser tabs
2. In tab 1: Lock the draft
3. In tab 2: Try to edit or assign images
4. **Expected:**
   - Tab 1: Lock succeeds
   - Tab 2: Should receive 409 Conflict error
   - Tab 2: Should show friendly toast message explaining the conflict
5. **If 409 is not handled:** Add proper error handling for concurrent edits

### Tab Conflict - Locking
1. Open the same draft in two tabs
2. Both tabs: Navigate to preview
3. Tab 1: Click "Bloquear" - keep confirmation dialog open
4. Tab 2: Click "Bloquear" and confirm
5. Tab 1: Confirm lock
6. **Expected:** One lock should succeed, one should fail with 409 Conflict

## API Abuse Tests

Test that the API properly enforces business rules:

### PATCH Locked Draft
1. Lock a draft
2. Try to PATCH the draft (update layoutItems)
3. **Expected:** Should fail with 403 or 409 error
4. **UI Should:** Show toast error explaining draft is locked

### POST Order Twice
1. Lock a draft
2. Create an order from the draft
3. Try to create another order from the same draft
4. **Expected:** Should fail (second order creation should be rejected)
5. **UI Should:** Show toast explaining order already exists

### DELETE Image Used in Draft
1. Upload an image
2. Assign it to a slot in a draft
3. Try to delete the image (if this functionality exists)
4. **Expected:** Should fail or be blocked
5. **If deletion is allowed:** Should cascade properly or show warning

### Access Another User's Draft
1. User A: Create a draft
2. User B: Try to access User A's draft via URL
3. **Expected:** Should fail with 403 Forbidden
4. **UI Should:** Show "You don't have access" toast

### Admin Edit Customer Draft
1. Admin user: Try to edit a customer's draft
2. **Expected:** Should be blocked (admins shouldn't edit customer drafts)
3. **UI Should:** Show appropriate error message

## Error Handling Tests

### Network Failure
1. Disconnect internet or stop backend server
2. Try to perform any API operation (upload, save, lock, etc.)
3. **Expected:** Should show error toast with connection message
4. **UI Should:** Not crash, show recovery path

### 404 Not Found
1. Navigate to a non-existent draft URL: `/draft/non-existent-id/upload`
2. **Expected:** Should show 404 error toast
3. **UI Should:** Provide clear recovery path (link back to product page)

### 401 Unauthorized
1. Let session expire (or manually clear auth token)
2. Try to perform an authenticated operation
3. **Expected:** Should show "Sesión expirada" toast
4. **UI Should:** Redirect to sign-in or prompt re-authentication

### 409 Conflict
1. Perform concurrent edits as described in concurrency tests
2. **Expected:** Should show friendly conflict message
3. **UI Should:** Suggest reloading or checking for updates

## Edge Cases

### Upload 0 Images
1. Go to upload page
2. Don't upload any images
3. Try to continue
4. **Expected:** Button should be disabled
5. **If allowed:** Should show warning that minimum images required

### Lock Without Required Images
1. Upload fewer images than required slots
2. Try to go to preview and lock
3. **Expected:** Should show warning before allowing lock
4. **Alternative:** Prevent proceeding to preview until minimum images uploaded

### Empty Slot Names
1. If layout has slots with empty or invalid names
2. **Expected:** Should handle gracefully, show "Slot 1", "Slot 2", etc.

### Very Large Images
1. Upload a very large image file (e.g., 50MB+)
2. **Expected:** Should either compress or show size limit error
3. **UI Should:** Show helpful error about file size limits

### Special Characters in Slot Names
1. If slot names contain special characters or emojis
2. **Expected:** Should render correctly or sanitize gracefully

### Missing Images After Upload
1. Upload images
2. Before assigning, images get deleted from backend (simulate)
3. Try to use those images
4. **Expected:** Should show "Image not found" placeholder or error
5. **UI Should:** Allow removing broken image references

## User Experience Tests

### Loading States
1. Perform slow operations (add artificial delay in network)
2. **Expected:** Should show loading spinners/skeletons
3. **UI Should:** Disable buttons during loading to prevent double-submission

### Toast Notifications
1. Perform various operations (success, error, info)
2. **Expected:** Toasts should appear and auto-dismiss
3. **UI Should:** Not block interactions, stack properly if multiple

### Lock Confirmation Dialog
1. Go to preview page
2. Click "Bloquear Diseño"
3. **Expected:** Confirmation dialog should appear
4. **Verify:** Dialog has clear warning message
5. **Verify:** Can cancel, can confirm
6. **On Success:** Should show "Diseño bloqueado — listo para ordenar" toast

### Navigation Flow
1. Complete full flow: Product → Upload → Edit → Preview → Lock → Confirm Order
2. **Expected:** Each step should flow smoothly
3. **Verify:** Can navigate back at appropriate points
4. **Verify:** Locked drafts cannot be edited

## Data Integrity Tests

### Draft Status Transitions
1. Create draft → should be 'draft'
2. Lock draft → should be 'locked'
3. Create order → draft should be 'ordered'
4. **Expected:** Status should only transition forward (draft → locked → ordered)
5. **Verify:** Cannot go backward (e.g., unlock a locked draft)

### Image References
1. Assign image to slot
2. Reload page
3. **Expected:** Image should still be assigned to the correct slot
4. **Verify:** Image URL should be valid and load

### Draft Metadata
1. Create draft with specific product and template
2. **Expected:** productId and templateId should persist correctly
3. **Verify:** Preview uses correct layout/template

## Performance Tests

### Many Images
1. Upload 20+ images
2. **Expected:** Should handle smoothly, UI should remain responsive
3. **UI Should:** Show proper loading states during processing

### Large Drafts
1. Create draft with many slots (if applicable)
2. **Expected:** Rendering should be fast
3. **UI Should:** Not freeze or lag

## Browser Compatibility

Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

**Expected:** All features should work consistently across browsers

## Mobile Responsiveness

1. Test on mobile viewport or device
2. **Expected:** UI should be usable and responsive
3. **Verify:** Images upload correctly on mobile
4. **Verify:** Calendar preview is readable on small screens

## Checklist Completion

After completing all tests, document:
- [ ] All reload tests pass
- [ ] Concurrency conflicts handled gracefully
- [ ] API abuse properly blocked
- [ ] Error messages are user-friendly
- [ ] Edge cases handled
- [ ] UX is smooth and intuitive
- [ ] Data integrity maintained
- [ ] Performance acceptable
- [ ] Cross-browser compatible
- [ ] Mobile responsive

## Notes

- If a test fails, document the failure and determine if it's a bug or expected behavior
- Update this checklist as new edge cases are discovered
- Some tests may require backend changes - document those separately
