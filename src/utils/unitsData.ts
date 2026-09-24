import { UnitCategory } from '../types';

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: 'Length',
    baseUnit: 'm',
    units: [
      { id: 'm', name: 'Meters', symbol: 'm', ratio: 1 },
      { id: 'km', name: 'Kilometers', symbol: 'km', ratio: 1000 },
      { id: 'cm', name: 'Centimeters', symbol: 'cm', ratio: 0.01 },
      { id: 'mm', name: 'Millimeters', symbol: 'mm', ratio: 0.001 },
      { id: 'mi', name: 'Miles', symbol: 'mi', ratio: 1609.344 },
      { id: 'yd', name: 'Yards', symbol: 'yd', ratio: 0.9144 },
      { id: 'ft', name: 'Feet', symbol: 'ft', ratio: 0.3048 },
      { id: 'in', name: 'Inches', symbol: 'in', ratio: 0.0254 },
      { id: 'nmi', name: 'Nautical Miles', symbol: 'nmi', ratio: 1852 },
    ],
  },
  {
    id: 'weight',
    name: 'Weight / Mass',
    baseUnit: 'kg',
    units: [
      { id: 'kg', name: 'Kilograms', symbol: 'kg', ratio: 1 },
      { id: 'g', name: 'Grams', symbol: 'g', ratio: 0.001 },
      { id: 'mg', name: 'Milligrams', symbol: 'mg', ratio: 0.000001 },
      { id: 't', name: 'Metric Tons', symbol: 't', ratio: 1000 },
      { id: 'lb', name: 'Pounds', symbol: 'lb', ratio: 0.45359237 },
      { id: 'oz', name: 'Ounces', symbol: 'oz', ratio: 0.028349523125 },
      { id: 'st', name: 'Stones', symbol: 'st', ratio: 6.35029318 },
    ],
  },
  {
    id: 'temperature',
    name: 'Temperature',
    baseUnit: 'c',
    units: [
      {
        id: 'c',
        name: 'Celsius',
        symbol: '°C',
        toBase: (c) => c,
        fromBase: (c) => c,
      },
      {
        id: 'f',
        name: 'Fahrenheit',
        symbol: '°F',
        toBase: (f) => ((f - 32) * 5) / 9,
        fromBase: (c) => (c * 9) / 5 + 32,
      },
      {
        id: 'k',
        name: 'Kelvin',
        symbol: 'K',
        toBase: (k) => k - 273.15,
        fromBase: (c) => c + 273.15,
      },
    ],
  },
  {
    id: 'volume',
    name: 'Volume',
    baseUnit: 'l',
    units: [
      { id: 'l', name: 'Liters', symbol: 'L', ratio: 1 },
      { id: 'ml', name: 'Milliliters', symbol: 'mL', ratio: 0.001 },
      { id: 'm3', name: 'Cubic Meters', symbol: 'm³', ratio: 1000 },
      { id: 'gal', name: 'US Gallons', symbol: 'gal', ratio: 3.785411784 },
      { id: 'qt', name: 'US Quarts', symbol: 'qt', ratio: 0.946352946 },
      { id: 'pt', name: 'US Pints', symbol: 'pt', ratio: 0.473176473 },
      { id: 'cup', name: 'US Cups', symbol: 'cup', ratio: 0.2365882365 },
      { id: 'floz', name: 'US Fluid Ounces', symbol: 'fl oz', ratio: 0.0295735295625 },
      { id: 'tbsp', name: 'Tablespoons', symbol: 'tbsp', ratio: 0.01478676478125 },
      { id: 'tsp', name: 'Teaspoons', symbol: 'tsp', ratio: 0.00492892159375 },
    ],
  },
  {
    id: 'area',
    name: 'Area',
    baseUnit: 'm2',
    units: [
      { id: 'm2', name: 'Square Meters', symbol: 'm²', ratio: 1 },
      { id: 'km2', name: 'Square Kilometers', symbol: 'km²', ratio: 1000000 },
      { id: 'ft2', name: 'Square Feet', symbol: 'ft²', ratio: 0.09290304 },
      { id: 'in2', name: 'Square Inches', symbol: 'in²', ratio: 0.00064516 },
      { id: 'ac', name: 'Acres', symbol: 'ac', ratio: 4046.8564224 },
      { id: 'ha', name: 'Hectares', symbol: 'ha', ratio: 10000 },
      { id: 'mi2', name: 'Square Miles', symbol: 'mi²', ratio: 2589988.110336 },
    ],
  },
  {
    id: 'speed',
    name: 'Speed',
    baseUnit: 'ms',
    units: [
      { id: 'ms', name: 'Meters per second', symbol: 'm/s', ratio: 1 },
      { id: 'kmh', name: 'Kilometers per hour', symbol: 'km/h', ratio: 0.2777777777777778 },
      { id: 'mph', name: 'Miles per hour', symbol: 'mph', ratio: 0.44704 },
      { id: 'kn', name: 'Knots', symbol: 'kn', ratio: 0.5144444444444445 },
      { id: 'fts', name: 'Feet per second', symbol: 'ft/s', ratio: 0.3048 },
    ],
  },
  {
    id: 'time',
    name: 'Time',
    baseUnit: 's',
    units: [
      { id: 'ms', name: 'Milliseconds', symbol: 'ms', ratio: 0.001 },
      { id: 's', name: 'Seconds', symbol: 's', ratio: 1 },
      { id: 'min', name: 'Minutes', symbol: 'min', ratio: 60 },
      { id: 'h', name: 'Hours', symbol: 'h', ratio: 3600 },
      { id: 'd', name: 'Days', symbol: 'd', ratio: 86400 },
      { id: 'wk', name: 'Weeks', symbol: 'wk', ratio: 604800 },
      { id: 'mo', name: 'Months (avg)', symbol: 'mo', ratio: 2629800 },
      { id: 'yr', name: 'Years (365d)', symbol: 'yr', ratio: 31536000 },
    ],
  },
  {
    id: 'digital',
    name: 'Digital Storage',
    baseUnit: 'b',
    units: [
      { id: 'bit', name: 'Bits', symbol: 'b', ratio: 0.125 },
      { id: 'b', name: 'Bytes', symbol: 'B', ratio: 1 },
      { id: 'kb', name: 'Kilobytes (KB)', symbol: 'KB', ratio: 1024 },
      { id: 'mb', name: 'Megabytes (MB)', symbol: 'MB', ratio: 1048576 },
      { id: 'gb', name: 'Gigabytes (GB)', symbol: 'GB', ratio: 1073741824 },
      { id: 'tb', name: 'Terabytes (TB)', symbol: 'TB', ratio: 1099511627776 },
      { id: 'pb', name: 'Petabytes (PB)', symbol: 'PB', ratio: 1125899906842624 },
    ],
  },
];

export function convertUnits(
  categoryKey: string,
  fromUnitId: string,
  toUnitId: string,
  value: number
): { result: number; formula: string } {
  const category = UNIT_CATEGORIES.find((c) => c.id === categoryKey);
  if (!category) return { result: value, formula: '' };

  const fromUnit = category.units.find((u) => u.id === fromUnitId);
  const toUnit = category.units.find((u) => u.id === toUnitId);

  if (!fromUnit || !toUnit) return { result: value, formula: '' };

  if (fromUnitId === toUnitId) {
    return { result: value, formula: `1 ${fromUnit.symbol} = 1 ${toUnit.symbol}` };
  }

  let baseVal = 0;
  if (fromUnit.toBase) {
    baseVal = fromUnit.toBase(value);
  } else if (fromUnit.ratio !== undefined) {
    baseVal = value * fromUnit.ratio;
  }

  let finalVal = 0;
  if (toUnit.fromBase) {
    finalVal = toUnit.fromBase(baseVal);
  } else if (toUnit.ratio !== undefined) {
    finalVal = baseVal / toUnit.ratio;
  }

  // Calculate 1 unit standard exchange formula
  let oneBase = 0;
  if (fromUnit.toBase) {
    oneBase = fromUnit.toBase(1);
  } else if (fromUnit.ratio !== undefined) {
    oneBase = 1 * fromUnit.ratio;
  }
  let oneTo = 0;
  if (toUnit.fromBase) {
    oneTo = toUnit.fromBase(oneBase);
  } else if (toUnit.ratio !== undefined) {
    oneTo = oneBase / toUnit.ratio;
  }

  const roundedRate = Math.round(oneTo * 1e8) / 1e8;
  const formula = `1 ${fromUnit.symbol} = ${roundedRate} ${toUnit.symbol}`;

  return { result: finalVal, formula };
}
