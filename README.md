# Space Optimization *(In progress 🙂)*

## Project Aim
This project aims to develop a space optimization program focused on efficiently arranging triangular objects within a defined space to maximize unused area. Given the complexity of this challenge, the initial scope is deliberately limited:

- The container space is assumed to be an empty regular cuboid (or cube).
- Triangles have fixed side lengths and constant thickness.
- For now, the problem is considered in 2D space only, focusing on flat triangles.

> **Core Question**  
> *How well can we arrange triangles in a space using the smallest possible area?*

---

## Current Implementation
The project provides an interactive Cartesian plane using **HTML5 Canvas** and **JavaScript**, allowing users to draw, manipulate, and experiment with spatial arrangements of both lines and triangles.

### 🔺 Triangle Features
Create triangles using construction modes:
- **SSS** (Side-Side-Side)
- **SAS** (Side-Angle-Side)
- **AAS** (Angle-Angle-Side)

Additional features:
- Built-in validation via the Triangle Inequality Theorem
- Full interactivity:
  - Move, Resize, Rotate
  - Delete, Undo, Copy & Paste
- Rotation handle stays fixed relative to one vertex for a professional UI feel
- Triangles maintain vertex-level geometry updates and preserve construction logic

---

### ➖ Line & Canvas Interaction
- Draw straight or arrowed lines on a Cartesian plane
- Drag endpoints or full lines to reshape
- Right-click to delete lines
- Real-time coordinate tooltips
- Pan and zoom the view
- Undo with **Ctrl + Z**
- Choose line colors with a color picker
- Toggle fullscreen view

---

## Usage

1. Click **Draw Line** or **Triangle Mode** to begin
2. For triangles:
   - Select **SSS**, **SAS**, or **AAS** mode
   - Input side lengths or angles as needed
   - Move or rotate shapes by dragging or using handles
   - Resize triangles by dragging vertices
3. Right-click to delete elements
4. Use **Ctrl + Z** to undo and **Ctrl + C / Ctrl + V** for copy-paste
5. Zoom with the mouse wheel
6. Pan using right or middle mouse button
7. Toggle fullscreen with the fullscreen button

---

## Tech Stack
- **HTML5 Canvas** – for drawing
- **JavaScript** – for interactivity and geometry logic
- **CSS** – for layout and interface styling

---

## Development

To connect your local repo to GitHub, run:

```bash
git init
git remote add origin https://github.com/markkamuya/space-optimization.git
git add .
git commit -m "Initial commit"
git push -u origin main
