import { delayUntilStep } from '../src/warmup/appearSchedule';

describe('delayUntilStep', () => {
  it('targets start + step * interval', () => {
    expect(delayUntilStep(1000, 3, 500, 1000)).toBe(1500);
  });

  it('shortens the delay by the lateness of the previous step so drift does not accumulate', () => {
    // step 2 was meant for t=2000 but ran at t=2040; step 3 is still due at t=2500
    expect(delayUntilStep(1000, 3, 500, 2040)).toBe(460);
  });

  it('never returns a negative delay', () => {
    expect(delayUntilStep(0, 1, 500, 9000)).toBe(0);
  });
});
