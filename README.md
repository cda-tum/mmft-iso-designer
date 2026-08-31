# MMFT ISO Designer

<p align="center">
<img src="https://www.cda.cit.tum.de/research/microfluidics/logo-microfluidics-toolkit.png" style="margin:auto;width:60%"/>
</p>

The MMFT ISO Designer is a tool that validates and generates microfluidic chip designs following the ISO 22916 standard. It is developed as part of the [Munich Microfluidics Toolkit (MMFT)](https://www.cda.cit.tum.de/research/microfluidics/munich-microfluidics-toolkit/) by the [Chair for Design Automation](https://www.cda.cit.tum.de/) at the Technical University of Munich. Currently, it is able to place and route basic modules, two types of exclusion zones, and channels while validating a number of geometric constraints. For more details, please check out the relevant research paper:

> P. Ebner, T. Scholl and R. Wille, "Automatic Validation and Design Generation of Modular Microfluidic Devices Based on ISO 22916," in IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems, doi: 10.1109/TCAD.2026.3709084.

> https://ieeexplore.ieee.org/document/11592466

## Usage

To use the tool locally, install `node` and `npm`, then run:

```sh
npm install
```

To start a single instance on a local port run:

```sh
npm start
```

To start two instances on two local ports (possible since the computational load is single-cored) run:

```sh
npm run start:port1
npm run start:port2
```

A browser window should open up where you can load an input file using the `Load` button.

Example configurations featured in the corresponding research paper can be found in the `examples` directory.

## How to Cite

In case you are using our tool in your work, we would be thankful if you referred to it by citing the following [publication](https://ieeexplore.ieee.org/document/11592466):

```bibtex
@ARTICLE{11592466,
  author={Ebner, Philipp and Scholl, Tim and Wille, Robert},
  journal={IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems}, 
  title={Automatic Validation and Design Generation of Modular Microfluidic Devices Based on ISO 22916}, 
  year={2026},
  volume={},
  number={},
  pages={1-1},
  keywords={Design automation;Design methodology;Routing;      Modules (abstract algebra);PIN photodiodes;Pins;Clamps;ISO;Silicon;Ports (computers);Microfluidics;ISO 22916:2022;Lab-on-a-Chip;Validation;Chip Design},
  doi={10.1109/TCAD.2026.3709084}}
```

## Q&A

### Why does the displayed runtime appear to be significantly lower than the time the program takes to deliver results?

The measured runtime includes Z3 solving runtime only. Producing the constraints, passing constraints to the solver and generating output images is not included. This discrepancy becomes obvious mostly for validation cases with a large set of constraints, but low actual solver runtime.

### How do I abort the program?

Simply reload or close the tab or browser window.
