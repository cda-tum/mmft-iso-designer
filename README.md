# MMFT ISO Designer

The MMFT ISO Designer is a tool that validates and generates microfluidic chip designs following the ISO 22916 standard. It is developed as part of the [Munich Microfluidics Toolkit (MMFT)](https://www.cda.cit.tum.de/research/microfluidics/munich-microfluidics-toolkit/) by the [Chair for Design Automation](https://www.cda.cit.tum.de/) at the Technical University of Munich. Currently, it is able to place and route basic modules and channels while validating a number of geometric constraints. For more details, please check out the relevant research paper:

> P. Ebner and R. Wille. Automatic Validation and Design of Microfluidic
Devices Following the ISO 22916 Standard. In IEEE Computer Society Annual Symposium on VLSI (ISVLSI). 2024.

## Usage

To use the tool locally, install `node` and `npm`, then run

```sh
npm install
npm start
```

A browser window should open up where you can load an input file using the `Load` button.

Example configurations featured in the corresponding research paper can be found in the `examples` directory.

## Q&A

### Why does the displayed runtime appear to be significantly lower than the time the program takes to deliver results?

The measured runtime includes Z3 solving runtime only. Producing the constraints, passing constraints to the solver and generating output images is not included. This discrepancy becomes obvious mostly for validation cases with a large set of constraints, but low actual solver runtime.

### How do I abort the program?

Simply reload or close the tab or browser window.
