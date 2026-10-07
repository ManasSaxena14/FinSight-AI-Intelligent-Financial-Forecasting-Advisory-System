---
title: What FinSight's numbers mean
as_of: Current app version
sources: FinSight AI documentation
---

## Health score (0–100)
A transparent, rule-based score — not a machine-learning prediction. It comes mainly from your savings rate (the share of income you didn't spend), with a penalty when one category takes more than 40% of income or 70% of spending. Roughly: under 40 needs attention, 60–75 is good, 85+ is excellent.

## Forecast and 80% range
Each category is forecast from your own past months (a damped trend model once you have 6+ months, exponential smoothing before that; with very little data it leans on typical spending for your income bracket). The 80% range means that, if the model is well calibrated, actual spending should land inside it about 8 months out of 10. The Analytics page shows the measured error on your own history.

## Overspend risk
The probability that next month's spending will exceed next month's income, calculated from the forecast and its uncertainty. "Drivers" show which categories are forecast highest relative to people with similar income.

## Unusual spending (anomalies)
Once you have four or more months, each category in your latest complete month is compared with your own median, adjusted for income. Before that, it is compared with peers. A flag means "unusually high for you", not "bad".

## Month in progress
If the current month has only a few days logged, FinSight treats it as in progress and leaves it out of the models until it is complete, so a half-month doesn't distort the forecast.

## Peer data
Peer comparisons use a synthetic reference dataset grouped by income bracket. It is used only for comparisons and cold-start estimates, never as your forecast once you have history.
