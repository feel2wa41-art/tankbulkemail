/**
 * StatCard Molecule Component
 * 통계 카드 컴포넌트
 */
import { ReactNode } from 'react';
import { Card } from '../atoms';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'green' | 'red' | 'blue' | 'yellow';
}

const colorStyles = {
  primary: 'text-primary-600',
  green: 'text-green-600',
  red: 'text-red-600',
  blue: 'text-blue-600',
  yellow: 'text-yellow-600',
};

export default function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'primary',
}: StatCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-3xl font-bold ${colorStyles[color]}`}>{value}</p>
          {trend && (
            <div className="flex items-center mt-1">
              <span
                className={`text-sm ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-400 ml-1">vs yesterday</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`text-3xl opacity-50 ${colorStyles[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
