"use client";

import { useState } from "react";
import { AnimatedRadialChart } from "@/components/ui/animated-radial-chart";

export default function AnimatedRadialChartDemo() {
  const [value, setValue] = useState(74);
  const [size, setSize] = useState(300);
  const [strokeWidth, setStrokeWidth] = useState<number | undefined>(undefined);
  const [showLabels, setShowLabels] = useState(true);
  const [duration, setDuration] = useState(2);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-lg bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-bold text-white">Controls</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Value: {value}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={e => setValue(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Size: {size}px</label>
              <input
                type="range"
                min="100"
                max="500"
                value={size}
                onChange={e => setSize(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Stroke Width: {strokeWidth || "Auto"}</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="8"
                  max="40"
                  value={strokeWidth || size * 0.06}
                  onChange={e => setStrokeWidth(Number(e.target.value))}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700"
                />
                <button
                  onClick={() => setStrokeWidth(undefined)}
                  className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
                >
                  Auto
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Duration: {duration}s</label>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Show Labels</label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={e => setShowLabels(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-400">Enabled</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setValue(25)} className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">25%</button>
                <button onClick={() => setValue(50)} className="rounded bg-yellow-600 px-2 py-1 text-xs text-white hover:bg-yellow-700">50%</button>
                <button onClick={() => setValue(75)} className="rounded bg-orange-600 px-2 py-1 text-xs text-white hover:bg-orange-700">75%</button>
                <button onClick={() => setValue(100)} className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">100%</button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <AnimatedRadialChart
            value={value}
            size={size}
            strokeWidth={strokeWidth}
            showLabels={showLabels}
            duration={duration}
            key={`${value}-${size}-${strokeWidth}-${showLabels}-${duration}`}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Size Variations</h2>
          <div className="grid grid-cols-1 items-center justify-items-center gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <p className="mb-2 text-sm text-gray-400">Small (150px)</p>
              <AnimatedRadialChart value={45} size={150} />
            </div>
            <div className="text-center">
              <p className="mb-2 text-sm text-gray-400">Medium (200px)</p>
              <AnimatedRadialChart value={65} size={200} />
            </div>
            <div className="text-center">
              <p className="mb-2 text-sm text-gray-400">Large (250px)</p>
              <AnimatedRadialChart value={85} size={250} />
            </div>
            <div className="text-center">
              <p className="mb-2 text-sm text-gray-400">Extra Large (300px)</p>
              <AnimatedRadialChart value={95} size={300} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
