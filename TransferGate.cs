using System.Threading;

namespace SpeedPulse;

/// <summary>
/// Process-wide, non-queuing concurrency gate for active speed-test bodies.
/// Each successful lease must be disposed, including on client disconnect.
/// </summary>
public sealed class TransferGate
{
    private readonly SemaphoreSlim slots;
    private int active;

    public TransferGate(int maximum)
    {
        if (maximum < 1) throw new ArgumentOutOfRangeException(nameof(maximum));
        slots = new SemaphoreSlim(maximum, maximum);
    }

    public int ActiveCount => Volatile.Read(ref active);

    /// <returns>A lease or null when all transfer slots are occupied.</returns>
    public IDisposable? TryAcquire()
    {
        if (!slots.Wait(0)) return null;
        Interlocked.Increment(ref active);
        return new Lease(this);
    }

    private void Release()
    {
        Interlocked.Decrement(ref active);
        slots.Release();
    }

    private sealed class Lease : IDisposable
    {
        private readonly TransferGate gate;
        private int disposed;

        public Lease(TransferGate gate) => this.gate = gate;

        public void Dispose()
        {
            if (Interlocked.Exchange(ref disposed, 1) == 0)
                gate.Release();
        }
    }
}
