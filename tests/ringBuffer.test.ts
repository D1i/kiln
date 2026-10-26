import { FrameRingBuffer } from '../src/metrics/ringBuffer';

describe('FrameRingBuffer', () => {
  it('returns samples oldest first before it is full', () => {
    const buffer = new FrameRingBuffer(4);
    buffer.push(1, 11);
    buffer.push(2, 12);

    expect(buffer.length).toBe(2);
    expect(buffer.cpuAt(0)).toBe(1);
    expect(buffer.intervalAt(1)).toBe(12);
  });

  it('overwrites the oldest sample when full and keeps the order', () => {
    const buffer = new FrameRingBuffer(3);
    for (let value = 1; value <= 5; value++) buffer.push(value, value * 10);

    expect(buffer.length).toBe(3);
    expect([buffer.cpuAt(0), buffer.cpuAt(1), buffer.cpuAt(2)]).toEqual([3, 4, 5]);
    expect(buffer.intervalAt(0)).toBe(30);
  });

  it('counts absolute sequence numbers across wrap-around', () => {
    const buffer = new FrameRingBuffer(3);
    for (let value = 0; value < 7; value++) buffer.push(value, value);

    expect(buffer.sequence).toBe(7);
    expect(buffer.firstSequence).toBe(4);
  });

  it('rejects an index outside the retained range', () => {
    const buffer = new FrameRingBuffer(3);
    buffer.push(1, 1);

    expect(() => buffer.cpuAt(1)).toThrow(RangeError);
    expect(() => buffer.cpuAt(-1)).toThrow(RangeError);
  });

  it('starts over after clear', () => {
    const buffer = new FrameRingBuffer(3);
    buffer.push(1, 1);
    buffer.clear();

    expect(buffer.length).toBe(0);
    expect(buffer.sequence).toBe(0);
  });
});
