'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { TrainingHistory } from '@/lib/types';
import GlassCard from './GlassCard';

export default function TrainingCharts({ history }: { history: TrainingHistory }) {
  const data = history.accuracy.map((acc, i) => ({
    epoch: i + 1,
    accuracy: acc,
    val_accuracy: history.val_accuracy[i],
    loss: history.loss[i],
    val_loss: history.val_loss[i],
  }));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <GlassCard>
        <h3 className="font-display text-lg text-ink">Accuracy</h3>
        <p className="mb-4 text-xs text-inkmuted">Training vs. validation, per epoch</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid stroke="#E4E7EC" strokeDasharray="3 3" />
            <XAxis dataKey="epoch" stroke="#5B6472" fontSize={12} tickLine={false} />
            <YAxis stroke="#5B6472" fontSize={12} tickLine={false} domain={[0, 1]} />
            <Tooltip
              contentStyle={{
                background: 'rgba(252,252,250,0.95)',
                border: '1px solid #E4E7EC',
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="accuracy" name="Train" stroke="#0FA3A0" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="val_accuracy"
              name="Validation"
              stroke="#E8735C"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard>
        <h3 className="font-display text-lg text-ink">Loss</h3>
        <p className="mb-4 text-xs text-inkmuted">Training vs. validation, per epoch</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid stroke="#E4E7EC" strokeDasharray="3 3" />
            <XAxis dataKey="epoch" stroke="#5B6472" fontSize={12} tickLine={false} />
            <YAxis stroke="#5B6472" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: 'rgba(252,252,250,0.95)',
                border: '1px solid #E4E7EC',
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="loss" name="Train" stroke="#0FA3A0" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="val_loss"
              name="Validation"
              stroke="#E8735C"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}
