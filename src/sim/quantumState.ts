/**
 * quantumState.ts — Exact state vector simulation and Bloch sphere projection
 * for 1 to 5 qubits.
 */

export interface Complex {
  r: number; // Real
  i: number; // Imaginary
}

export function complex(r: number, i = 0): Complex {
  return { r, i };
}

export function cAdd(a: Complex, b: Complex): Complex {
  return { r: a.r + b.r, i: a.i + b.i };
}

export function cSub(a: Complex, b: Complex): Complex {
  return { r: a.r - b.r, i: a.i - b.i };
}

export function cMul(a: Complex, b: Complex): Complex {
  return { r: a.r * b.r - a.i * b.i, i: a.r * b.i + a.i * b.r };
}

export function cAbsSq(a: Complex): number {
  return a.r * a.r + a.i * a.i;
}

export function cPhase(a: Complex): number {
  return Math.atan2(a.i, a.r);
}

export interface BlochCoords {
  x: number;
  y: number;
  z: number;
  theta: number; // [0, pi]
  phi: number;   // [0, 2pi]
  purity: number;
  prob0: number;
  prob1: number;
}

export interface QuantumStateVector {
  numQubits: number;
  dim: number;
  amplitudes: Complex[];
  probabilities: number[];
  ketString: string;
}

export class QuantumStateSimulator {
  numQubits: number;
  dim: number;
  state: Complex[];

  constructor(numQubits = 5) {
    this.numQubits = Math.min(Math.max(numQubits, 1), 6);
    this.dim = 1 << this.numQubits;
    this.state = Array.from({ length: this.dim }, (_, i) => (i === 0 ? complex(1, 0) : complex(0, 0)));
  }

  reset() {
    this.state = Array.from({ length: this.dim }, (_, i) => (i === 0 ? complex(1, 0) : complex(0, 0)));
  }

  apply1Q(target: number, matrix: [Complex, Complex, Complex, Complex]) {
    const bit = 1 << target;
    const [u00, u01, u10, u11] = matrix;

    for (let i = 0; i < this.dim; i += 2 * bit) {
      for (let j = 0; j < bit; j++) {
        const i0 = i + j;
        const i1 = i + j + bit;
        const psi0 = this.state[i0];
        const psi1 = this.state[i1];

        this.state[i0] = cAdd(cMul(u00, psi0), cMul(u01, psi1));
        this.state[i1] = cAdd(cMul(u10, psi0), cMul(u11, psi1));
      }
    }
  }

  apply2Q(control: number, target: number, gateName: "cx" | "cz" | "swap") {
    const cBit = 1 << control;
    const tBit = 1 << target;

    for (let i = 0; i < this.dim; i++) {
      if (gateName === "cx") {
        if ((i & cBit) !== 0 && (i & tBit) === 0) {
          const partner = i | tBit;
          const temp = this.state[i];
          this.state[i] = this.state[partner];
          this.state[partner] = temp;
        }
      } else if (gateName === "cz") {
        if ((i & cBit) !== 0 && (i & tBit) !== 0) {
          this.state[i] = { r: -this.state[i].r, i: -this.state[i].i };
        }
      } else if (gateName === "swap") {
        const cVal = (i & cBit) !== 0 ? 1 : 0;
        const tVal = (i & tBit) !== 0 ? 1 : 0;
        if (cVal === 1 && tVal === 0) {
          const partner = (i & ~cBit) | tBit;
          const temp = this.state[i];
          this.state[i] = this.state[partner];
          this.state[partner] = temp;
        }
      }
    }
  }

  applyGate(name: string, qubits: number[], params: number[] = []) {
    const invSqrt2 = 1 / Math.SQRT2;
    if (name === "h" && qubits.length >= 1) {
      this.apply1Q(qubits[0], [complex(invSqrt2), complex(invSqrt2), complex(invSqrt2), complex(-invSqrt2)]);
    } else if (name === "x" && qubits.length >= 1) {
      this.apply1Q(qubits[0], [complex(0), complex(1), complex(1), complex(0)]);
    } else if (name === "y" && qubits.length >= 1) {
      this.apply1Q(qubits[0], [complex(0), complex(0, -1), complex(0, 1), complex(0)]);
    } else if (name === "z" && qubits.length >= 1) {
      this.apply1Q(qubits[0], [complex(1), complex(0), complex(0), complex(-1)]);
    } else if (name === "s" && qubits.length >= 1) {
      this.apply1Q(qubits[0], [complex(1), complex(0), complex(0), complex(0, 1)]);
    } else if (name === "sdg" && qubits.length >= 1) {
      this.apply1Q(qubits[0], [complex(1), complex(0), complex(0), complex(0, -1)]);
    } else if (name === "t" && qubits.length >= 1) {
      this.apply1Q(qubits[0], [complex(1), complex(0), complex(0), complex(invSqrt2, invSqrt2)]);
    } else if (name === "tdg" && qubits.length >= 1) {
      this.apply1Q(qubits[0], [complex(1), complex(0), complex(0), complex(invSqrt2, -invSqrt2)]);
    } else if (name === "rz" && qubits.length >= 1) {
      const theta = params[0] || 0;
      const cosHalf = Math.cos(theta / 2);
      const sinHalf = Math.sin(theta / 2);
      this.apply1Q(qubits[0], [complex(cosHalf, -sinHalf), complex(0), complex(0), complex(cosHalf, sinHalf)]);
    } else if (name === "rx" && qubits.length >= 1) {
      const theta = params[0] || 0;
      const cosHalf = Math.cos(theta / 2);
      const sinHalf = Math.sin(theta / 2);
      this.apply1Q(qubits[0], [complex(cosHalf), complex(0, -sinHalf), complex(0, -sinHalf), complex(cosHalf)]);
    } else if (name === "ry" && qubits.length >= 1) {
      const theta = params[0] || 0;
      const cosHalf = Math.cos(theta / 2);
      const sinHalf = Math.sin(theta / 2);
      this.apply1Q(qubits[0], [complex(cosHalf), complex(-sinHalf), complex(sinHalf), complex(cosHalf)]);
    } else if ((name === "cx" || name === "cnot") && qubits.length >= 2) {
      this.apply2Q(qubits[0], qubits[1], "cx");
    } else if (name === "cz" && qubits.length >= 2) {
      this.apply2Q(qubits[0], qubits[1], "cz");
    } else if (name === "swap" && qubits.length >= 2) {
      this.apply2Q(qubits[0], qubits[1], "swap");
    }
  }

  getBlochCoords(targetQubit: number): BlochCoords {
    if (targetQubit < 0 || targetQubit >= this.numQubits) {
      return { x: 0, y: 0, z: 1, theta: 0, phi: 0, purity: 1, prob0: 1, prob1: 0 };
    }
    const tBit = 1 << targetQubit;

    let rho00 = complex(0);
    let rho01 = complex(0);
    let rho10 = complex(0);
    let rho11 = complex(0);

    for (let i = 0; i < this.dim; i++) {
      if ((i & tBit) === 0) {
        const i0 = i;
        const i1 = i | tBit;
        const psi0 = this.state[i0];
        const psi1 = this.state[i1];

        // rho_00 += |psi0|^2
        rho00 = cAdd(rho00, complex(cAbsSq(psi0)));
        // rho_01 += psi0 * conj(psi1)
        rho01 = cAdd(rho01, cMul(psi0, { r: psi1.r, i: -psi1.i }));
        // rho_10 += psi1 * conj(psi0)
        rho10 = cAdd(rho10, cMul(psi1, { r: psi0.r, i: -psi0.i }));
        // rho_11 += |psi1|^2
        rho11 = cAdd(rho11, complex(cAbsSq(psi1)));
      }
    }

    const x = 2 * rho01.r;
    const y = 2 * rho10.i;
    const z = rho00.r - rho11.r;
    const r = Math.min(Math.sqrt(x * x + y * y + z * z), 1.0);
    const theta = Math.acos(Math.max(Math.min(z / (r || 1), 1), -1));
    let phi = Math.atan2(y, x);
    if (phi < 0) phi += 2 * Math.PI;

    return {
      x: parseFloat(x.toFixed(4)),
      y: parseFloat(y.toFixed(4)),
      z: parseFloat(z.toFixed(4)),
      theta: parseFloat(theta.toFixed(4)),
      phi: parseFloat(phi.toFixed(4)),
      purity: parseFloat((r * r).toFixed(4)),
      prob0: parseFloat(rho00.r.toFixed(4)),
      prob1: parseFloat(rho11.r.toFixed(4)),
    };
  }

  getSnapshot(): QuantumStateVector {
    const probabilities = this.state.map(c => parseFloat(cAbsSq(c).toFixed(5)));
    const terms: string[] = [];

    for (let i = 0; i < this.dim; i++) {
      const prob = probabilities[i];
      if (prob > 0.001) {
        const binStr = i.toString(2).padStart(this.numQubits, "0");
        const amp = this.state[i];
        const ampMag = Math.sqrt(prob).toFixed(3);
        const sign = amp.r >= 0 ? "+" : "-";
        terms.push(`${sign} ${ampMag}|${binStr}⟩`);
      }
    }

    let ketStr = terms.join(" ").trim();
    if (ketStr.startsWith("+ ")) ketStr = ketStr.substring(2);
    if (!ketStr) ketStr = "|0...0⟩";

    return {
      numQubits: this.numQubits,
      dim: this.dim,
      amplitudes: [...this.state],
      probabilities,
      ketString: ketStr,
    };
  }
}
