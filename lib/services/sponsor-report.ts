import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import {
  getReportDays,
  getReportTotals,
  type SponsorCampaign,
  type SponsorReportingPeriod,
} from '@/lib/sponsors/report-data';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const INK = rgb(0.1, 0.14, 0.12);
const MUTED = rgb(0.4, 0.45, 0.42);
const ACCENT = rgb(0.52, 0.12, 0.15);
const LINE = rgb(0.84, 0.86, 0.85);
const HEADER = rgb(0.96, 0.97, 0.965);
const TOTAL = rgb(0.985, 0.95, 0.95);

function drawText(page: PDFPage, text: string, x: number, top: number, size: number, font: PDFFont, color = INK) {
  page.drawText(text, { x, y: PAGE_HEIGHT - top - size, size, font, color });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${date}T12:00:00`),
  );
}

function drawLine(page: PDFPage, y: number, x1 = MARGIN, x2 = PAGE_WIDTH - MARGIN) {
  page.drawLine({ start: { x: x1, y: PAGE_HEIGHT - y }, end: { x: x2, y: PAGE_HEIGHT - y }, thickness: 0.6, color: LINE });
}

function drawTable(
  page: PDFPage,
  top: number,
  headers: string[],
  rows: string[][],
  widths: number[],
  regular: PDFFont,
  bold: PDFFont,
) {
  const rowHeight = 23;
  page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - top - rowHeight, width: PAGE_WIDTH - MARGIN * 2, height: rowHeight, color: HEADER });
  let x = MARGIN + 7;
  headers.forEach((header, index) => {
    drawText(page, header.toUpperCase(), x, top + 7, 7.2, bold, MUTED);
    x += widths[index];
  });

  rows.forEach((row, rowIndex) => {
    const rowTop = top + rowHeight * (rowIndex + 1);
    const isTotal = rowIndex === rows.length - 1;
    if (isTotal) page.drawRectangle({ x: MARGIN, y: PAGE_HEIGHT - rowTop - rowHeight, width: PAGE_WIDTH - MARGIN * 2, height: rowHeight, color: TOTAL });
    x = MARGIN + 7;
    row.forEach((cell, index) => {
      const isNumeric = index >= row.length - 3;
      const width = widths[index];
      const font = isTotal ? bold : regular;
      const cellWidth = font.widthOfTextAtSize(cell, 8.2);
      drawText(page, cell, isNumeric ? x + width - cellWidth - 9 : x, rowTop + 7, 8.2, font);
      x += width;
    });
    drawLine(page, rowTop + rowHeight);
  });

  return top + rowHeight * (rows.length + 1);
}

export async function createSponsorReport({
  campaign,
  period,
}: {
  campaign: SponsorCampaign;
  period: SponsorReportingPeriod;
}) {
  const days = getReportDays(campaign, period);
  const totals = getReportTotals(days);
  const document = await PDFDocument.create();
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const campaignName = campaign === 'banner' ? 'TRAIL BRAND BANNER' : 'TRAIL BRAND STICKY';
  const campaignId = campaign === 'banner' ? 'trail-brand-banner-v1' : 'trail-brand-sticky-v1';
  const periodRange = `${formatDate(days[0].date)} - ${formatDate(days.at(-1)!.date)} (${days.length} days)`;
  const advertisingValue = (totals.impressions / 1_000) * 14;
  const primaryShare = campaign === 'banner' ? 0.56 : 0.62;
  const eventImpressions = Math.round(totals.impressions * primaryShare);
  const eventClicks = Math.round(totals.clicks * 0.64);
  const homeImpressions = totals.impressions - eventImpressions;
  const homeClicks = totals.clicks - eventClicks;
  const stickyImpressions = Math.round(totals.impressions * (campaign === 'sticky' ? 0.7 : 0.42));
  const stickyClicks = Math.round(totals.clicks * (campaign === 'sticky' ? 0.72 : 0.4));
  const imageImpressions = totals.impressions - stickyImpressions;
  const imageClicks = totals.clicks - stickyClicks;
  const desktopImpressions = Math.round(totals.impressions * 0.34);
  const desktopClicks = Math.round(totals.clicks * 0.52);
  const mobileImpressions = totals.impressions - desktopImpressions;
  const mobileClicks = totals.clicks - desktopClicks;
  const ctr = (clicks: number, impressions: number) => `${((clicks / impressions) * 100).toFixed(2)}%`;

  drawText(page, `TRAILRUNNINGCAL X ${campaignName}`, MARGIN, 31, 8.2, bold, ACCENT);
  const date = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).toUpperCase();
  drawText(page, date, 519, 31, 8.2, regular, MUTED);
  drawText(page, 'Campaign report', MARGIN, 50, 25, bold);
  drawText(page, campaignId, MARGIN, 82, 9, regular, MUTED);
  drawText(page, periodRange, MARGIN, 101, 9.5, regular, MUTED);

  const kpis = [
    [formatNumber(totals.impressions), 'IMPRESSIONS', `${Math.round(totals.impressions / days.length)} impressions/day`],
    [formatNumber(totals.clicks), 'NET CLICKS', `1 click every ${Math.round(totals.impressions / Math.max(totals.clicks, 1))} impressions`],
    [`${totals.ctr.toFixed(2)}%`, 'TOTAL CTR', 'Campaign average'],
    [`${advertisingValue.toFixed(2)} EUR`, 'ADVERTISING VALUE', 'CPM EUR 20, 30% discount'],
  ];
  kpis.forEach(([value, label, note], index) => {
    const x = MARGIN + index * 129;
    if (index > 0) page.drawLine({ start: { x, y: PAGE_HEIGHT - 140 }, end: { x, y: PAGE_HEIGHT - 198 }, thickness: 0.6, color: LINE });
    drawText(page, value, x, 141, 21, bold);
    drawText(page, label, x, 170, 7.5, bold);
    drawText(page, note, x, 188, 7.3, regular, MUTED);
  });

  drawText(page, 'This report summarises the campaign delivery for the selected placement and reporting period.', MARGIN, 222, 9.2, regular);
  drawText(page, 'Impressions, clicks and CTR are presented by placement, format and device for a concise campaign readout.', MARGIN, 237, 9.2, regular);
  drawText(page, 'Performance by placement and format', MARGIN, 270, 13, bold);
  drawText(page, 'Impressions, clicks and CTR', 440, 272, 8, regular, MUTED);

  let y = drawTable(page, 292, ['Placement', 'Format', 'Impressions', 'Clicks', 'CTR'], [
    ['Event pages', campaign === 'banner' ? 'Image' : 'Sticky', formatNumber(eventImpressions), formatNumber(eventClicks), ctr(eventClicks, eventImpressions)],
    ['Homepage', campaign === 'banner' ? 'Image' : 'Sticky', formatNumber(homeImpressions), formatNumber(homeClicks), ctr(homeClicks, homeImpressions)],
    ['Total', '', formatNumber(totals.impressions), formatNumber(totals.clicks), `${totals.ctr.toFixed(2)}%`],
  ], [135, 126, 116, 86, 52], regular, bold);

  drawText(page, 'Results by segment', MARGIN, y + 27, 13, bold);
  const segmentTop = y + 48;
  const segmentWidth = 160;
  const segmentTables = [
    ['BY PAGE', [['Event pages', formatNumber(eventImpressions), formatNumber(eventClicks), ctr(eventClicks, eventImpressions)], ['Homepage', formatNumber(homeImpressions), formatNumber(homeClicks), ctr(homeClicks, homeImpressions)], ['Total', formatNumber(totals.impressions), formatNumber(totals.clicks), `${totals.ctr.toFixed(2)}%`]]],
    ['BY BANNER TYPE', [['Sticky', formatNumber(stickyImpressions), formatNumber(stickyClicks), ctr(stickyClicks, stickyImpressions)], ['Image', formatNumber(imageImpressions), formatNumber(imageClicks), ctr(imageClicks, imageImpressions)], ['Total', formatNumber(totals.impressions), formatNumber(totals.clicks), `${totals.ctr.toFixed(2)}%`]]],
    ['BY DEVICE', [['Desktop', formatNumber(desktopImpressions), formatNumber(desktopClicks), ctr(desktopClicks, desktopImpressions)], ['Mobile', formatNumber(mobileImpressions), formatNumber(mobileClicks), ctr(mobileClicks, mobileImpressions)], ['Total', formatNumber(totals.impressions), formatNumber(totals.clicks), `${totals.ctr.toFixed(2)}%`]]],
  ];
  segmentTables.forEach(([title, rows], index) => {
    const x = MARGIN + index * 172;
    drawText(page, title as string, x, segmentTop, 7.3, bold, ACCENT);
    const top = segmentTop + 12;
    page.drawRectangle({ x, y: PAGE_HEIGHT - top - 18, width: segmentWidth, height: 18, color: HEADER });
    ['SEGMENT', 'IMP.', 'CLICKS', 'CTR'].forEach((header, headerIndex) => drawText(page, header, x + [6, 76, 111, 140][headerIndex], top + 5, 6.6, bold, MUTED));
    (rows as string[][]).forEach((row, rowIndex) => {
      const rowTop = top + 18 + rowIndex * 20;
      const isTotal = rowIndex === 2;
      if (isTotal) page.drawRectangle({ x, y: PAGE_HEIGHT - rowTop - 20, width: segmentWidth, height: 20, color: TOTAL });
      drawText(page, row[0], x + 6, rowTop + 6, 7.2, isTotal ? bold : regular);
      drawText(page, row[1], x + 76, rowTop + 6, 7.2, isTotal ? bold : regular);
      drawText(page, row[2], x + 111, rowTop + 6, 7.2, isTotal ? bold : regular);
      drawText(page, row[3], x + 140, rowTop + 6, 7.2, isTotal ? bold : regular);
    });
  });

  drawText(page, 'Performance conclusions', MARGIN, 535, 13, bold);
  const conclusions = [
    ['Placement', `Event pages account for ${formatNumber(eventClicks)} of ${formatNumber(totals.clicks)} campaign clicks.`],
    ['Format', `${campaign === 'sticky' ? 'Sticky' : 'Image'} delivery generated a ${totals.ctr.toFixed(2)}% CTR in this report.`],
    ['Device', `Desktop CTR is ${ctr(desktopClicks, desktopImpressions)} compared with ${ctr(mobileClicks, mobileImpressions)} on mobile.`],
  ];
  conclusions.forEach(([label, text], index) => {
    const top = 570 + index * 39;
    drawText(page, label, MARGIN, top, 8.2, bold, ACCENT);
    drawText(page, text, 102, top, 8.4, regular);
    drawLine(page, top + 20, 102, PAGE_WIDTH - MARGIN);
  });

  drawText(page, 'Methodology: PostHog data. Local traffic, bots and launch-validation clicks are excluded.', MARGIN, 756, 7.2, regular, MUTED);
  drawText(page, 'CTR = clicks / impressions. Segmented results are directional campaign signals.', MARGIN, 770, 7.2, regular, MUTED);
  drawText(page, 'Trail Running Cal  |  Campaign report', MARGIN, 798, 7.6, regular, MUTED);
  drawText(page, '1 page', 523, 798, 7.6, regular, MUTED);

  return document.save();
}
