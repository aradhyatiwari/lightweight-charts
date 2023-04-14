import { ensureDefined } from '../helpers/assertions';

import { PlotRow } from '../model/plot-data';
import { SeriesPlotRow } from '../model/series-data';
import { SeriesType } from '../model/series-options';
import { OriginalTime, TimePoint, TimePointIndex } from '../model/time-data';

import { AbstractData, AreaData, BarData, BaselineData, CandlestickData, HistogramData, isWhitespaceData, LineData, SeriesDataItemTypeMap, WhitespaceData } from './data-consumer';

function getColoredLineBasedSeriesPlotRow(time: TimePoint, index: TimePointIndex, item: LineData | HistogramData, originalTime: OriginalTime): Mutable<SeriesPlotRow<'Line' | 'Histogram'>> {
	const val = item.value;

	const res: Mutable<SeriesPlotRow<'Line' | 'Histogram'>> = { index, time, value: [val, val, val, val], originalTime };

	if (item.color !== undefined) {
		res.color = item.color;
	}

	return res;
}

function getAreaSeriesPlotRow(time: TimePoint, index: TimePointIndex, item: AreaData, originalTime: OriginalTime): Mutable<SeriesPlotRow<'Area'>> {
	const val = item.value;

	const res: Mutable<SeriesPlotRow<'Area'>> = { index, time, value: [val, val, val, val], originalTime };

	if (item.lineColor !== undefined) {
		res.lineColor = item.lineColor;
	}

	if (item.topColor !== undefined) {
		res.topColor = item.topColor;
	}

	if (item.bottomColor !== undefined) {
		res.bottomColor = item.bottomColor;
	}

	return res;
}

function getBaselineSeriesPlotRow(time: TimePoint, index: TimePointIndex, item: BaselineData, originalTime: OriginalTime): Mutable<SeriesPlotRow<'Baseline'>> {
	const val = item.value;

	const res: Mutable<SeriesPlotRow<'Baseline'>> = { index, time, value: [val, val, val, val], originalTime };

	if (item.topLineColor !== undefined) {
		res.topLineColor = item.topLineColor;
	}

	if (item.bottomLineColor !== undefined) {
		res.bottomLineColor = item.bottomLineColor;
	}

	if (item.topFillColor1 !== undefined) {
		res.topFillColor1 = item.topFillColor1;
	}

	if (item.topFillColor2 !== undefined) {
		res.topFillColor2 = item.topFillColor2;
	}

	if (item.bottomFillColor1 !== undefined) {
		res.bottomFillColor1 = item.bottomFillColor1;
	}

	if (item.bottomFillColor2 !== undefined) {
		res.bottomFillColor2 = item.bottomFillColor2;
	}

	return res;
}

function getBarSeriesPlotRow(time: TimePoint, index: TimePointIndex, item: BarData, originalTime: OriginalTime): Mutable<SeriesPlotRow<'Bar'>> {
	const res: Mutable<SeriesPlotRow<'Bar'>> = { index, time, value: [item.open, item.high, item.low, item.close], originalTime };

	if (item.color !== undefined) {
		res.color = item.color;
	}

	return res;
}

function getCandlestickSeriesPlotRow(time: TimePoint, index: TimePointIndex, item: CandlestickData, originalTime: OriginalTime): Mutable<SeriesPlotRow<'Candlestick'>> {
	const res: Mutable<SeriesPlotRow<'Candlestick'>> = { index, time, value: [item.open, item.high, item.low, item.close], originalTime };
	if (item.color !== undefined) {
		res.color = item.color;
	}

	if (item.borderColor !== undefined) {
		res.borderColor = item.borderColor;
	}

	if (item.wickColor !== undefined) {
		res.wickColor = item.wickColor;
	}

	return res;
}

// The returned data is used for scaling the series, and providing the current value for the price scale
export type AbstractDataToPlotRowValueConverter = (item: AbstractData | WhitespaceData) => [
	number, // open
	number, // high
	number, // low
	number, // close
];

function getAbstractSeriesPlotRow(time: TimePoint, index: TimePointIndex, item: AbstractData | WhitespaceData, originalTime: OriginalTime, dataToPlotRow?: AbstractDataToPlotRowValueConverter): Mutable<SeriesPlotRow<'Abstract'>> {
	const value = ensureDefined(dataToPlotRow)(item);
	const { time: excludedTime, color, ...data } = item as AbstractData;
	return { index, time, value, originalTime, data, color };
}

export type WhitespacePlotRow = Omit<PlotRow, 'value'>;

export function isSeriesPlotRow(row: SeriesPlotRow | WhitespacePlotRow): row is SeriesPlotRow {
	return (row as Partial<SeriesPlotRow>).value !== undefined;
}

type SeriesItemValueFnMap = {
	[T in keyof SeriesDataItemTypeMap]: (time: TimePoint, index: TimePointIndex, item: SeriesDataItemTypeMap[T], originalTime: OriginalTime, dataToPlotRow?: AbstractDataToPlotRowValueConverter) => Mutable<SeriesPlotRow<T> | WhitespacePlotRow>;
};

function wrapCustomValues<T extends SeriesPlotRow | WhitespacePlotRow>(plotRow: Mutable<T>, bar: SeriesDataItemTypeMap[SeriesType]): Mutable<T> {
	if (bar.customValues !== undefined) {
		plotRow.customValues = bar.customValues;
	}
	return plotRow;
}

function wrapWhitespaceData<TSeriesType extends SeriesType>(createPlotRowFn: (typeof getBaselineSeriesPlotRow) | (typeof getBarSeriesPlotRow) | (typeof getCandlestickSeriesPlotRow)): SeriesItemValueFnMap[TSeriesType] {
	return (time: TimePoint, index: TimePointIndex, bar: SeriesDataItemTypeMap[SeriesType], originalTime: OriginalTime) => {
		if (isWhitespaceData(bar)) {
			return wrapCustomValues({ time, index, originalTime }, bar);
		}

		return wrapCustomValues(createPlotRowFn(time, index, bar, originalTime), bar);
	};
}

const seriesPlotRowFnMap: SeriesItemValueFnMap = {
	Candlestick: wrapWhitespaceData(getCandlestickSeriesPlotRow),
	Bar: wrapWhitespaceData(getBarSeriesPlotRow),
	Area: wrapWhitespaceData(getAreaSeriesPlotRow),
	Baseline: wrapWhitespaceData(getBaselineSeriesPlotRow),
	Histogram: wrapWhitespaceData(getColoredLineBasedSeriesPlotRow),
	Line: wrapWhitespaceData(getColoredLineBasedSeriesPlotRow),
	Abstract: getAbstractSeriesPlotRow,
};

export function getSeriesPlotRowCreator<TSeriesType extends SeriesType>(seriesType: TSeriesType): SeriesItemValueFnMap[TSeriesType] {
	return seriesPlotRowFnMap[seriesType];
}
