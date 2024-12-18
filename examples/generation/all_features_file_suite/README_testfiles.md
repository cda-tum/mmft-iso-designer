# Test Use Cases

This suite of input use cases serves to demonstrate the features of the ISO Designer and showcase its abilities and performance.
The runtime is very dependent on the complexity and design liberties regarding free placement, positioning and orientation of components.


## Naming scheme and abbreviations

To accommodate as much information as possible into the file name I have introduced an abbreviation scheme to classify each file and its properties.

The file name with all possible abbreviations (some contain less as needed) is structured like this:
The dashes separate sections describing different components from each other while underscores separate different identifiers within one section.


### Structure

`mc` `-` `5m_1fo_1fp_0b` `-` `8c_2f_1ml_16s_2el_2mw_2ew` `-` `1mez_1fo` `-` `1cez` `-` `sc`

- First section: chip size
- Second section: Modules
- Third section: Channels
- Fourth section: dynamic module exclusion zones
- Fifth section: static chip exclusion zones
- Sixth section: flag for soft corners property (no sharp angled routing)


### Abbreviations:

#### Chip section:
- `mc`: medium chip

#### Module section:
- `m`: total number of modules | in the example it would be 5
- `fo`: free orientation | the component can be oriented in one of four directions
- `fp`: free position | the module is not fixed and can be moved on the chip to possible locations
- `b`: bottom | total number of modules mounted on the bottom of the chip

#### Channel section:
- `c`: total number of channels | in the example it would be 8
- `f`: free channels | channels that just have the mandatory properties like modules, ports and maxSegments
- `ml`: multi-layered | total number of channels that are on "Layer Two" not conflicting with "Layer One"
- `s`: total number of max channel segments | in the example it would be 16
- `el`: exact length | channels that have an exact final length given
- `mw`: mandatory waypoints | channels that have some mandatory waypoints but not all waypoints given
- `ew`: exact waypoints | channels that have all mandatory waypoints given and are therefore fixed

#### Module exclusion section:
- `mez`: total number of dynamic module exclusion zones | in the example it would be 1
- `fo`: free orientation | the exclusion zone is oriented according to the free orientation of its module

#### Chip exclusion section:
- `cez`: total number of static chip exclusion zones | in the example it would be 1

#### Flag section:
- `sc`: soft corner routing | if the flag is there only 135-degree angle routing is enabled