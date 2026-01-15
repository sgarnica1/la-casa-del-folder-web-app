# 🎯 MVP Definition — La Casa del Folder

## MVP GOAL (One Sentence)

A user can create a photo calendar, preview it, lock it, and the system stores an immutable order that can be fulfilled exactly as previewed.

---

## 🧱 MVP FUNCTIONAL SCOPE (NOT NEGOTIABLE)

### ✅ INCLUDED

#### 1. One Product Only
- Calendar
- Fixed size
- Fixed layout
- No variants

---

#### 2. Asset Upload
- Upload images
- Persist uploaded images
- Reuse images across drafts

---

#### 3. Minimal Editor
- Assign images to predefined layout slots
- No drag & drop
- No free positioning
- No advanced transforms

---

#### 4. Preview
- Preview reflects **exactly** the stored draft data
- Same data will be used for fulfillment
- No export
- No PDF

---

#### 5. Draft Locking
- Explicit user action
- Locked drafts cannot be edited
- Locking is irreversible

---

#### 6. Order Creation
- Fake payment (for now)
- Real order record
- Full snapshot of the design at order time

---

#### 7. Internal Order Review
A human can verify:
- Images
- Layout
- Transforms
- Order metadata

This review guarantees the order can be fulfilled exactly as previewed.

---

## 🚫 EXPLICITLY OUT OF SCOPE

If you feel tempted to add any of these — **don’t**.

- Catalog browsing
- Multiple products
- Product variants
- Cart
- Real payment
- Shipping logic
- PDF export
- Print-ready files
- Promotions
- Undo / redo
- Autoscaling editor

---

## 🔒 THE MVP DECISION RULE (PRINT THIS)

Before coding **anything**, ask:

> **Does this change what gets stored in the Order snapshot?**

- **NO** → Not MVP  
- **YES** → Consider it  
- **MAYBE** → Defer it  

This rule overrides personal preference, “nice-to-haves”, and future ideas.

---

## 🧠 Core Mental Model

The system is built around **four concepts only**:

1. **Product**  
   What you sell (e.g. Calendar Vertical, fixed size)

2. **Draft**  
   A mutable, in-progress design  
   👉 *This is the heart of the system*

3. **Order**  
   An immutable snapshot of a finished draft at purchase time

4. **Asset (Image)**  
   User-uploaded photos reused across drafts and products

Everything else is supporting structure.
