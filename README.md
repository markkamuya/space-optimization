# Space Optimization - Interactive Cartesian Plane

This project provides an interactive Cartesian plane implemented using HTML5 Canvas and JavaScript. It allows users to draw, edit, and manage lines and arrowed lines with pan and zoom capabilities.

## Features

- Draw straight lines or arrow lines on the Cartesian plane.
- Drag endpoints or entire lines to move or reshape them.
- Pan the view by dragging with middle/right mouse buttons or touch.
- Zoom in/out with the mouse wheel.
- Right-click lines to delete them.
- Undo functionality with `Ctrl + Z`.
- Color picker to change line colors.
- Fullscreen mode to maximize the drawing area.
- Coordinate tooltip showing the exact Cartesian coordinates under the cursor.

## Usage

- Click the **Draw Line** button to start drawing a new line.
- Toggle the **Arrow Lines** button to switch between normal lines and arrow lines.
- Use the color picker to select the line color.
- Drag existing lines or endpoints to adjust their positions.
- Right-click a line to open a context menu for deleting it.
- Pan by dragging with right or middle mouse button.
- Zoom with the mouse wheel.
- Press `Ctrl + Z` to undo changes.
- Click the fullscreen button to toggle fullscreen mode.

## Tech Stack

- HTML5 Canvas for drawing.
- JavaScript for interactivity and line management.
- CSS for styling controls and layout.

## Development

To link this project with your local Git repository and GitHub remote, follow these steps:

```bash
git init
git remote add origin https://github.com/markkamuya/space-optimization.git
git add .
git commit -m "Initial commit"
git push -u origin main
