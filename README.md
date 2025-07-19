# 🧮 Triangle Packing Toolkit  
**Geometric Construction and Optimal Packing of Triangles within Rectangular Boundaries**

---

## 📘 Overview

This project tackles the mathematical and algorithmic challenge of constructing and fitting triangles inside a fixed rectangular region with minimal wasted space. It supports manual geometric construction modes (SSS, SAS, ASA/AAS) and offers an automated packing mode optimized for specific triangle types (right, equilateral, isosceles, scalene).

Built with interactive HTML5 Canvas rendering, it enables precise control, real-time validation, and efficient spatial arrangement of triangles in 2D.

---

## 🔧 Core Technologies

- **HTML5 Canvas API** for dynamic 2D rendering and user interactions  
- **Vanilla JavaScript** for geometric computations, UI logic, and event handling  
- **CSS3** for clean UI styling and responsive layout  
- Custom-built **triangle construction and packing algorithms** based on classical Euclidean geometry and computational optimization  

---

## 🧮 Mathematical Foundations

### Triangle Construction Modes

- **SSS (Side-Side-Side)**: Constructs triangles given three side lengths satisfying the triangle inequality.  
- **SAS (Side-Angle-Side)**: Constructs triangles from two sides and their included angle.  
- **ASA / AAS (Angle-Side-Angle / Angle-Angle-Side)**: Constructs triangles based on two angles and one adjacent side.

### Triangle Validity Constraints

For triangle ΔABC with sides a, b, c:

\[
a + b > c,\quad b + c > a,\quad c + a > b
\]

This inequality ensures a valid, non-degenerate triangle.

### Boundary Fitting Conditions

Given rectangle bounds defined by:

\[
x_{\text{min}} \leq x \leq x_{\text{max}}, \quad y_{\text{min}} \leq y \leq y_{\text{max}}
\]

The triangle’s vertices \( (x_i, y_i) \) must satisfy:

\[
x_{\min} \leq x_i \leq x_{\max}, \quad y_{\min} \leq y_i \leq y_{\max} \quad \forall i \in \{1,2,3\}
\]

---

## 🚧 Key Features

### 🎨 Interactive Manual Editor

- Construct triangles interactively via **SSS**, **SAS**, or **ASA/AAS** input forms  
- Real-time validation of triangle inequalities and angle constraints  
- Vertex manipulation with drag-and-drop on canvas  
- Undo and redo operations for iterative editing  
- Snap-to-grid and boundary constraints to enforce rectangle containment

### 🤖 Automated Packing Engine

- Supports optimized packing strategies tailored to triangle types:

  - **Right Triangles:** Grid-aligned mirrored pairs with rotated residual placement  
  - **Equilateral Triangles:** Hexagonal staggered tiling for maximal density  
  - **Isosceles Triangles:** Up/down stacking with height adjustments via Pythagorean theorem  
  - **Scalene Triangles:** Basic row-wise bounding box placement without rotation optimization

- User-specified rectangular packing area with real-time layout rendering  
- Color-coded triangles with opacity for visual clarity  
- Undo/redo stack maintained during packing for exploration

---

## 📐 Algorithmic Highlights

- **Triangle Classification:** Using side length comparisons and angle calculations (Law of Cosines)  
- **Coordinate Computation:** Vertex positions derived via trigonometric relations for all construction modes  
- **Packing Layout:** Calculates maximum rows and columns fitting within rectangle dimensions based on triangle height and base  
- **Collision and Boundary Checks:** Ensures no triangle overlaps or escapes the packing boundary  

---

## 🖼️ Rendering and UI

- HTML Canvas 2D context renders triangles with fill and stroke for distinction  
- Interactive vertex points represented as draggable circles  
- Responsive canvas resizing with coordinate scaling  
- Modal input forms for entering geometric parameters

---

## 🛠️ Development and Usage

Clone and open `index.html` in any modern browser.

- Use the **Manual Mode** tab to draw and edit triangles with detailed geometric inputs.  
- Switch to **Automatic Mode** to input triangle parameters and rectangle dimensions, then pack triangles automatically.

---

## ⚙️ Planned Enhancements

- Implement rotation optimization for scalene triangle packing  
- Add export options (SVG, PNG, DXF) for external use  
- Integrate multi-type triangle mixed packing algorithms  
- Enhance UI with pan, zoom, and layer management  

---

## 📜 License

This project is licensed under the MIT License.

---

## ✍️ Author

Crafted with mathematical rigor and geometric elegance by [Your Name].  
Powered by JavaScript and the foundational principles of Euclidean geometry.

--- 

---
## 🤓 Bonus Fun

Casually made a **Necker Cube** in my triangle editor 😎  
Turns out optical illusions are just one `rotate()` away from accidental brilliance.

![App Screenshot](https://github.com/markkamuya/space-optimization/blob/main/Screenshot%202025-07-03%20024031.png?raw=true)

> Curious what a Necker Cube is?  
> Learn more about this famous ambiguous figure here:
> 🔗 [Necker Cube Optical Illusion on Wikipedia](https://en.wikipedia.org/wiki/Necker_cube)
---
