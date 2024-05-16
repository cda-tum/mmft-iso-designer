import React, { useEffect, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { init } from 'z3-solver';
import { design } from './da/design';
import { Input, Output } from './da/input_output';
import { BuildingBlock, BuildingBlockInstance } from './da/building_block';
import { example } from './da/test';
import { ChipView, svgAsString } from './gui/view/ChipView';
import { Channel, ChannelInstance } from './da/channel';
import { Chip } from './da/chip';
import { StaticRoutingExclusion } from './da/routing-exclusion';
import { workspaceActions, workspaceSelectors, workspaceSlice } from './gui/data/workspace';
import { store } from './gui/data/store';
import { EntityType, entityActions } from './gui/data/entity';
import { Module, Rotation, generate_ports } from './gui/data/iso/module';
import { pairwise_unique_indexed } from './da/utils';
import { Button, Typography } from '@mui/joy';
import { nanoid } from '@reduxjs/toolkit';
import { Status, StatusProps, StatusType } from './gui/view/Status';

function App() {

  const tempInput = useRef<HTMLInputElement>(null);

  const channel = new Channel({
    width: 400,
    height: 400,
    spacing: 400,
    max_segments: 5
  })

  const defaultInput = new Input({
    chip: Chip.from({
      width: 128000,
      height: 85500
    }),
    building_blocks: [
      new BuildingBlockInstance({
        fixed_position: {
          x: 20000,
          y: 15000
        },
        fixed_rotation: Rotation.Up,
        width: 30000,
        height: 60000,
        pitch: 3000,
        spacing: 1000,
        active_ports: [
          [0, 0], [2, 0], [4, 0], [6, 0], [8, 0],
          [1, 1], [3, 1], [5, 1], [7, 1],
          [1, 17], [3, 17], [5, 17], [7, 17],
          [0, 18], [2, 18], [6, 18], [8, 18],
        ]
      }),
      new BuildingBlockInstance({
        fixed_position: {
          x: 80000,
          y: 15000
        },
        fixed_rotation: Rotation.Up,
        width: 30000,
        height: 60000,
        pitch: 3000,
        spacing: 1000,
        active_ports: [
          [0, 0], [2, 0], [4, 0], [6, 0], [8, 0],
          [1, 1], [3, 1], [5, 1], [7, 1],
          [1, 17], [3, 17], [5, 17], [7, 17],
          [0, 18], [2, 18], [6, 18], [8, 18],
        ]
      }),
    ],
    channels: [channel.create({
      from: {
        building_block: 0,
        port: [0, 0]
      },
      to: {
        building_block: 0,
        port: [0, 18]
      },
      fixed_length: 100000
    }), channel.create({
      from: {
        building_block: 0,
        port: [1, 1]
      },
      to: {
        building_block: 0,
        port: [5, 17]
      },
      fixed_length: 100000
    }), channel.create({
      from: {
        building_block: 0,
        port: [8, 0]
      },
      to: {
        building_block: 0,
        port: [2, 18]
      },
      fixed_length: 100000
    }), /*channel.create({
      from: {
        building_block: 0,
        port: [4, 0]
      },
      to: {
        building_block: 0,
        port: [7, 17]
      }
    }), channel.create({
      from: {
        building_block: 0,
        port: [3, 1]
      },
      to: {
        building_block: 0,
        port: [8, 18]
      }
    }), channel.create({
      from: {
        building_block: 0,
        port: [6, 0]
      },
      to: {
        building_block: 0,
        port: [1, 17]
      }
    }),*/

    channel.create({
      from: {
        building_block: 1,
        port: [0, 0],
      },
      to: {
        building_block: 1,
        port: [0, 18]
      },
      fixed_length: 100000
    }), channel.create({
      from: {
        building_block: 1,
        port: [1, 1]
      },
      to: {
        building_block: 1,
        port: [5, 17],
      },
      fixed_length: 100000
    }), channel.create({
      from: {
        building_block: 1,
        port: [8, 0]
      },
      to: {
        building_block: 1,
        port: [2, 18],
      },
      fixed_length: 100000
    }), /*channel.create({
      from: {
        building_block: 1,
        port: [4, 0]
      },
      to: {
        building_block: 1,
        port: [7, 17]
      }
    }), channel.create({
      from: {
        building_block: 1,
        port: [3, 1]
      },
      to: {
        building_block: 1,
        port: [8, 18]
      }
    }), channel.create({
      from: {
        building_block: 1,
        port: [6, 0]
      },
      to: {
        building_block: 1,
        port: [1, 17]
      }
    })*/
    ],
    routing_exclusions: [/*new StaticRoutingExclusion({
      position_x: 19000,
      position_y: 30000,
      width: 32000,
      height: 24000
    }), new StaticRoutingExclusion({
      position_x: 79000,
      position_y: 30000,
      width: 32000,
      height: 24000
    })*/]
  })

  /*const defaultInput = new Input({
    chip: Chip.from({
      width: 127000,
      height: 87000,
      pitch: 3000
    }),
    building_blocks: [
      new BuildingBlockInstance({
        fixed_position: {
          x: 20000,
          y: 15000
        },
        //fixed_rotation: Rotation.Right,
        width: 30000,
        height: 60000,
        pitch: 3000,
        active_ports: [
          [0, 0], [2, 0], [4, 0], [6, 0], [8, 0],
          [1, 1], [3, 1], [5, 1], [7, 1],
          [1, 17], [3, 17], [5, 17], [7, 17],
          [0, 18], [2, 18], [6, 18], [8, 18],
        ]
      }),
      new BuildingBlockInstance({
        fixed_position: {
          x: 89500,
          y: 60000
        },
        fixed_rotation: Rotation.Up,
        width: 10000,
        height: 10000,
        pitch: 3000,
        active_ports: [
          [0, 0],
        ]
      }),
    ],
    channels: [
      channel.create({
        from: {
          building_block: 0,
          port: [4, 0]
        },
        to: {
          building_block: 1,
          port: [0, 0]
        },
        fixed_waypoints: [{
          x: 10000,
          y: 17000
        }, {
          x: 10000,
          y: 10000
        }, {
          x: 100000,
          y: 10000
        }, {
          x: 100000,
          y: 70000
        }, {
          x: 91000,
          y: 70000
        }, {
          x: 91000,
          y: 60000
        }]
      })
    ],
    routing_exclusions: []
  })*/

  const [input, setInput] = useState(undefined as undefined | Input)
  const [output, setOutput] = useState(undefined as undefined | Output)


  useEffect(() => {
    if (input) {
      console.log("Running...")
      setStatus({
        status: StatusType.Computing,
        startTime: performance.now()
      })
      setOutput(undefined)
      design(input).then(r => {
        if (!r) {
          throw 'An unknown error has occurred.'
        } else {
          if (r.success) {
            setStatus({
              status: StatusType.Result,
              success: true,
              timing: r.timing!
            })
            setOutput(r)
          } else {
            setStatus({
              status: StatusType.Result,
              success: false,
              timing: r.timing!
            })
            setOutput(undefined)
          }
        }

      }).catch((e) => {
        setStatus({
          status: StatusType.Error,
          message: e.toString()
        })
      })
    } else {
      setOutput(undefined)
    }
  }, [input])

  const defaultStatus: StatusProps = {
    status: StatusType.Idle
  }
  const [status, setStatus] = useState<StatusProps>(defaultStatus)

  return (
    <div className="App">
      <header
        style={{
          backgroundColor: '#444',
        }}
      >
        <Typography
          level='h1'
          color='primary'
          sx={{
            color: '#fff',
          }}
        >MMFT ISO Designer</Typography>
      </header>
      <main>
        <div>
          <input
            type="file"
            name="name"
            ref={tempInput}
            style={{
              display: 'none'
            }}
            onChange={(e) => {
              if (e.target.files === null) {
                return
              }
              const file = e.target.files[0];

              const reader = new FileReader();
              reader.readAsText(file, 'UTF-8');

              reader.onload = readerEvent => {
                if (readerEvent.target === null) {
                  return
                }
                const content = readerEvent.target.result as string
                let config
                try {
                  config = JSON.parse(content)
                } catch (e) {
                  setStatus({
                    status: StatusType.Error,
                    message: 'Input file could not be parsed.'
                  })
                }
                setInput(Input.from(config))
              }

              if (tempInput.current) {
                tempInput.current.value = ''
              }
            }}
          />
          <Button
            onClick={() => {
              tempInput.current?.click()
            }}
            sx={{
              margin: 1
            }}
          >Load Input File</Button>
          <Button
            onClick={() => {
              if (output !== undefined) {
                const o = transformToInput(output)
                const id = nanoid()
                downloadJSON(o, id)
              }
            }}
            sx={{
              margin: 1
            }}
          >
            Download Output
          </Button>
          <Button
            onClick={() => {
              if (output !== undefined) {
                const id = nanoid()
                downloadSVG(svgAsString(output), id)
              }
            }}
            sx={{
              margin: 1
            }}
          >
            Download Image
          </Button>
        </div>
        <Status {...status}></Status>
        <ChipView chip={output}></ChipView>
      </main>
      <footer
        style={{
          position: 'absolute',
          width: '100%',
          bottom: 0,
          backgroundColor: '#444',
        }}
      >
        <a href="https://www.cda.cit.tum.de/research/microfluidics/" style={{ textDecoration: 'none' }}><Typography
          level='h4'
          sx={{
            color: '#fff',
            padding: 1
          }}
        >Chair for Design Automation<br />Technical University of Munich</Typography></a>
      </footer>
    </div>
  );
}

/*
<ChipView chip={output}></ChipView>
  {
    displayedWorkspace &&
      <WorkspaceView workspace={displayedWorkspace}></WorkspaceView>
  }
  */
/*
<Button
            onClick={() => {
              if (output !== undefined) {
                const o = transformToStaticInput(output)
                const id = nanoid()
                download(o, id)
              }
            }}
            sx={{
              margin: 1
            }}
          >
            Download Result as Static Input
          </Button>
*/

function transformToInput(o: Output, waypoints_fixed = true) {
  const output = {
    timing: o.timing,
    chip: {
      width: o.chip.width,
      height: o.chip.height
    },
    building_blocks: o.building_blocks.map(b => ({
      width: b.width,
      height: b.height,
      pitch: b.pitch,
      spacing: b.spacing,
      fixed_position: {
        x: b.results.position_x,
        y: b.results.position_y
      },
      fixed_rotation: b.results.rotation
    })),
    channels: o.channels.map(c => ({
      width: c.width,
      spacing: c.spacing,
      from: {
        building_block: c.from.building_block,
        port: c.from.port
      },
      to: {
        building_block: c.to.building_block,
        port: c.to.port
      },
      max_segments: c.max_segments,
      ...(c.fixed_length ? { fixed_length: c.fixed_length } : {}),
      ...(waypoints_fixed ? {
        fixed_waypoints: c.results.waypoints
      } : {}),
      actual_length: c.results.length
    })),
    routing_exclusions: o.routing_exclusions.map(e => ({
      position_x: e.position_x,
      position_y: e.position_y,
      width: e.width,
      height: e.height
    }))
  }

  return output
}

function transformToStaticInput(o: Output, waypoints_fixed = true) {
  const output = {
    timing: o.timing,
    chip: {
      width: o.chip.width,
      height: o.chip.height
    },
    building_blocks: o.building_blocks.map(b => ({
      width: b.width,
      height: b.height,
      pitch: b.pitch,
      spacing: b.spacing,
      fixed_position: {
        x: b.results.position_x,
        y: b.results.position_y
      },
      fixed_rotation: b.results.rotation
    })),
    channels: o.channels.map(c => ({
      width: c.width,
      spacing: c.spacing,
      from: {
        building_block: c.from.building_block,
        port: c.from.port
      },
      to: {
        building_block: c.to.building_block,
        port: c.to.port
      },
      max_segments: c.max_segments,
      ...(c.fixed_length ? { fixed_length: c.fixed_length } : {}),
      ...(waypoints_fixed ? {
        static_waypoints: c.results.waypoints
      } : {}),
      actual_length: c.results.length
    })),
    routing_exclusions: o.routing_exclusions.map(e => ({
      position_x: e.position_x,
      position_y: e.position_y,
      width: e.width,
      height: e.height
    }))
  }

  return output
}

function downloadJSON(exportObj: any, exportName: string) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, undefined, 2))
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function downloadSVG(exportString: string, exportName: string) {
  const dataStr = "data:image/svg;charset=utf-8," + encodeURIComponent(exportString)
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".svg");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export default App;
