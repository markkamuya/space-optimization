# Space Optimization (In progress :) )

## Project Aim

This project aims to develop a **space optimization program** focused on efficiently arranging triangular objects within a defined space to minimize unused area. Given the complexity of this challenge, the initial scope is deliberately limited:

- The container space is assumed to be an empty regular cuboid (or cube).
- Triangles have fixed side lengths and constant thickness.
- For now, the problem is considered in 2D space only, focusing on flat triangles.

The core question driving this project is:  
**How well can we arrange triangles in a space using the smallest possible area?**

---

## Current Implementation

Currently, the project provides an interactive Cartesian plane using HTML5 Canvas and JavaScript, allowing users to draw and manipulate lines. This serves as the foundational tool to later work with triangles and spatial arrangements.

Features implemented so far include:

- Drawing straight lines or arrow lines on the Cartesian plane.
- Dragging endpoints or entire lines to move or reshape them.
- Panning and zooming within the canvas.
- Deleting lines via right-click.
- Undoing actions with `Ctrl + Z`.
- Changing line colors with a color picker.
- Fullscreen mode.
- Coordinate tooltip displaying exact Cartesian coordinates under the cursor.

---

## Usage

- Click the **Draw Line** button to start drawing a new line.
- Toggle the **Arrow Lines** button to switch between normal lines and arrow lines.
- Use the color picker to select the line color.
- Drag existing lines or endpoints to adjust positions.
- Right-click a line to delete it.
- Pan the view with middle or right mouse button drag.
- Zoom using the mouse wheel.
- Undo changes with `Ctrl + Z`.
- Toggle fullscreen with the fullscreen button.

---

## Tech Stack

- HTML5 Canvas for drawing.
- JavaScript for interactivity.
- CSS for styling.

---

## Development

To connect your local repo to GitHub, run:

```bash
git init
git remote add origin https://github.com/markkamuya/space-optimization.git
git add .
git commit -m "Initial commit"
git push -u origin main
