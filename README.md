# MMFT ISO Designer

The MMFT ISO Designer is a tool that validates and generates microfluidic chip designs conforming to the ISO 22916 standard. It is developed as part of the Munich [Microfluidics Toolkit (MMFT)](https://www.cda.cit.tum.de/research/microfluidics/munich-microfluidics-toolkit/) by the [Chair for Design Automation](https://www.cda.cit.tum.de/) at the Technical University of Munich. Currently, it is able to place and route basic modules and channels while validating a number of geometric constraints. For more details, please check out the relevant research paper:

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
