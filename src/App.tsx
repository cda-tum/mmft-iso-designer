import React, { useEffect, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { init } from 'z3-solver';
import { design } from './da/design';
import { Input, Output } from './da/inputOutput';
import { BuildingBlock, BuildingBlockInstance } from './da/buildingBlock';
import { example } from './da/test';
import { ChipView, svgAsString } from './gui/view/ChipView';
import { Channel, ChannelInstance } from './da/channel';
import { Chip } from './da/chip';
import { StaticRoutingExclusion } from './da/routingExclusion';
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
