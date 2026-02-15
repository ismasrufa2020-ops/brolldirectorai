import React from 'react';
import { ImageStyle, VISUAL_STYLES, AspectRatio } from '../types';
import { Palette, Maximize, Check } from 'lucide-react';

interface StyleSelectorProps {
  selectedStyle: ImageStyle;
  onStyleSelect: (style: ImageStyle) => void;
  selectedRatio: AspectRatio;
  onRatioSelect: (ratio: AspectRatio) => void;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({
  selectedStyle,
  onStyleSelect,
  selectedRatio,
  onRatioSelect
}) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">
      
      {/* Aspect Ratio Section */}
      <div>
        <div className="flex items-center gap-2 mb-3 text-gray-300 font-medium">
          <Maximize className="w-4 h-4 text-indigo-400" />
          <span>Aspect Ratio</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AspectRatio).map(([key, value]) => (
            <button
              key={key}
              onClick={() => onRatioSelect(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedRatio === value
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-white'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {/* Style Section */}
      <div>
        <div className="flex items-center gap-2 mb-3 text-gray-300 font-medium">
          <Palette className="w-4 h-4 text-pink-400" />
          <span>Visual Style</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VISUAL_STYLES.map((style) => {
            const isSelected = selectedStyle.id === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onStyleSelect(style)}
                className={`relative group overflow-hidden rounded-lg border-2 transition-all duration-200 text-left h-24 p-3 flex flex-col justify-end ${
                  isSelected
                    ? 'border-indigo-500 shadow-xl shadow-indigo-900/30'
                    : 'border-transparent hover:border-gray-600'
                }`}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${style.previewColor} opacity-50 group-hover:opacity-70 transition-opacity`} />
                
                {/* Overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                {/* Content */}
                <div className="relative z-10 w-full flex justify-between items-end">
                  <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                    {style.name}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400 bg-white/10 rounded-full p-0.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StyleSelector;