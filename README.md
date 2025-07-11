# 🧠 Triangular Space Optimization Editor  
**Interactive Geometric Layout Tool for Constrained Packing of Triangles in 2D Space**

---

## 📘 Overview

This project addresses the complex geometric and algorithmic challenge of fitting fixed-size triangles inside a non-square, bounded rectangular region, minimizing unused space. Built as a prototype for manual configuration and future automated optimization, it leverages interactive construction logic with enforced geometric and spatial constraints.

---

## 🔧 Core Technologies

- **HTML5 Canvas** for 2D rendering and real-time interactivity  
- **JavaScript** for event-driven UI, geometric logic, and shape manipulation  
- **CSS** for UI styling and layout  
- **Custom geometry engines** for validation, containment checking, and interaction constraints

---

## 🧮 Mathematical Foundations

### Triangle Construction Modes

- **SSS (Side-Side-Side)**: Construct a triangle given all three sides.  
- **SAS (Side-Angle-Side)**: Construct a triangle using two sides and the included angle.  
- **AAS (Angle-Angle-Side)**: Construct using two angles and one adjacent side.

### Triangle Validity (Triangle Inequality Theorem)

For a triangle ΔABC, the following must hold:

\[
a + b > c,\quad b + c > a,\quad c + a > b
\]

### Boundary Fitting Logic

Bounding box is computed from triangle vertex coordinates. For valid placement inside the rectangular area, the triangle must satisfy:

\[
x_{\min} \geq x_{\text{rect\_left}},\quad x_{\max} \leq x_{\text{rect\_right}} \\
y_{\min} \geq y_{\text{rect\_top}},\quad y_{\max} \leq y_{\text{rect\_bottom}}
\]

---

## 🚧 Key Features

### 🎨 Interactive Editor

- Mouse-driven creation of triangles using **SSS**, **SAS**, or **AAS** construction logic  
- Real-time vertex snapping and visual feedback during creation  
- Clipboard support: **cut**, **copy**, **paste** triangles  
- Undo/Redo stack via operation history  
- Rotation handles locked to fixed triangle vertices for precision  
- Pan/Zoom and fullscreen toggling for better spatial management  

---

### 📦 Space Optimization Mode (Manual Configuration)

Activated via a dedicated UI pipeline to prepare valid manual input layouts for optimization.

#### 1. Oblong Rectangle Validation

- On entering space optimization mode, user is prompted to enter rectangle **width** and **height**  
- A constraint is applied: `width ≠ height`  
- An _oblong checker_ function validates and blocks square dimensions  
- Enforces aspect diversity crucial to packing studies

#### 2. Triangle Fit Enforcement

- During space optimization mode:  
  - All triangle construction actions perform a **fit-check** before committing to the canvas  
  - Fit-check involves simulating triangle placement and checking bounding box collision with the rectangle  
  - If the triangle exceeds the bounds, an alert is triggered and construction is aborted  

#### 3. In-Bounds Constraint Enforcement

Once a triangle is inside the bounding box:

- **Dragging** is constrained so that no vertex can leave the rectangle  
- **Resizing** and **rotation** operations are clamped using post-transformation bounding box validation  
- Reflects real-world constraints like material sheet cutting, panel design, or layout editors  

---
## 🤓 Bonus Fun

Casually made a **Necker Cube** in my triangle editor 😎  
Turns out optical illusions are just one `rotate()` away from accidental brilliance.

![App Screenshot](https://github.com/markkamuya/space-optimization/blob/main/Screenshot%202025-07-03%20024031.png?raw=true)

> Curious what a Necker Cube is?  
> Learn more about this famous ambiguous figure here:
> 🔗 [Necker Cube Optical Illusion on Wikipedia](https://en.wikipedia.org/wiki/Necker_cube)
---
## Development

To connect your local repo to GitHub, run:

```bash
git init
git remote add origin https://github.com/markkamuya/space-optimization.git
git add .
git commit -m "Initial commit"
git push -u origin main
