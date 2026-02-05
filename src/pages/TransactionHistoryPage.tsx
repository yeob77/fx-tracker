import { useState, useMemo } from 'react';
import { Table, Badge, Form, Row, Col, Button } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { PurchaseLot, SaleRecord } from '../types/definitions';

// Define a common type for transactions
interface Transaction {
  id: string;
  type: 'purchase' | 'sale';
  currency: 'USD' | 'JPY';
  date: string;
  rate: number; // Exchange rate per 1 unit of foreign currency
  quantity: number; // Quantity of foreign currency
  krwAmount: number; // Total KRW involved in the transaction
  fee: number; // Transaction fee in KRW
  realizedProfit?: number; // Only for sales
  memo?: string;
}

const TransactionHistoryPage = () => {
  const [usdLots] = useLocalStorage<PurchaseLot[]>('usdLots', []);
  const [usdSales] = useLocalStorage<SaleRecord[]>('usdSales', []);
  const [jpyLots] = useLocalStorage<PurchaseLot[]>('jpyLots', []);
  const [jpySales] = useLocalStorage<SaleRecord[]>('jpySales', []);

  const [filterCurrency, setFilterCurrency] = useState<'all' | 'USD' | 'JPY'>('all');
  const [filterType, setFilterType] = useState<'all' | 'purchase' | 'sale'>('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);

  const [sortColumn, setSortColumn] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const formatKrw = (amount: number) => {
    return `${amount >= 0 ? '' : '-'}${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })} KRW`;
  };

  const allTransactions: Transaction[] = useMemo(() => {
    const purchases: Transaction[] = [
      ...usdLots.map(lot => ({
        id: lot.id,
        type: 'purchase',
        currency: 'USD',
        date: lot.purchaseDate,
        rate: lot.purchasePrice,
        quantity: lot.initialQuantity,
        krwAmount: Math.round(lot.purchasePrice * lot.initialQuantity),
        fee: lot.fee || 0,
        memo: lot.memo,
      })),
      ...jpyLots.map(lot => ({
        id: lot.id,
        type: 'purchase',
        currency: 'JPY',
        date: lot.purchaseDate,
        rate: lot.purchasePrice,
        quantity: lot.initialQuantity,
        krwAmount: Math.round(lot.purchasePrice * lot.initialQuantity),
        fee: lot.fee || 0,
        memo: lot.memo,
      })),
    ];

    const sales: Transaction[] = [
      ...usdSales.map(sale => {
        const purchaseLot = usdLots.find(lot => lot.id === sale.purchaseLotId);
        return {
          id: sale.id,
          type: 'sale',
          currency: 'USD',
          date: sale.saleDate,
          rate: sale.salePrice,
          quantity: sale.quantity,
          krwAmount: Math.round(sale.salePrice * sale.quantity),
          fee: sale.fee || 0,
          realizedProfit: sale.realizedProfit,
        };
      }),
      ...jpySales.map(sale => {
        const purchaseLot = jpyLots.find(lot => lot.id === sale.purchaseLotId);
        return {
          id: sale.id,
          type: 'sale',
          currency: 'JPY',
          date: sale.saleDate,
          rate: sale.salePrice,
          quantity: sale.quantity,
          krwAmount: Math.round(sale.salePrice * sale.quantity),
          fee: sale.fee || 0,
          realizedProfit: sale.realizedProfit,
        };
      }),
    ];

    return [...purchases, ...sales];
  }, [usdLots, usdSales, jpyLots, jpySales]);

  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;

    if (filterCurrency !== 'all') {
      filtered = filtered.filter(t => t.currency === filterCurrency);
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    if (filterStartDate) {
      filtered = filtered.filter(t => new Date(t.date) >= filterStartDate);
    }
    if (filterEndDate) {
      const endDateInclusive = new Date(filterEndDate);
      endDateInclusive.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.date) <= endDateInclusive);
    }
    return filtered;
  }, [allTransactions, filterCurrency, filterType, filterStartDate, filterEndDate]);

  const sortedTransactions = useMemo(() => {
    const sortableTransactions = [...filteredTransactions];
    sortableTransactions.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
    return sortableTransactions;
  }, [filteredTransactions, sortColumn, sortDirection]);

  const handleSort = (column: keyof Transaction) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <div>
      <h2>통합 거래 내역</h2>

      <Row className="mb-3">
        <Col md={3}>
          <Form.Group controlId="filterCurrency">
            <Form.Label>통화</Form.Label>
            <Form.Select value={filterCurrency} onChange={e => setFilterCurrency(e.target.value as 'all' | 'USD' | 'JPY')}>
              <option value="all">전체</option>
              <option value="USD">USD</option>
              <option value="JPY">JPY</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group controlId="filterType">
            <Form.Label>유형</Form.Label>
            <Form.Select value={filterType} onChange={e => setFilterType(e.target.value as 'all' | 'purchase' | 'sale')}>
              <option value="all">전체</option>
              <option value="purchase">매수</option>
              <option value="sale">매도</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group controlId="filterStartDate">
            <Form.Label>시작일</Form.Label>
            <DatePicker
              selected={filterStartDate}
              onChange={(date: Date | null) => setFilterStartDate(date)}
              dateFormat="yyyy-MM-dd"
              className="form-control"
              isClearable
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group controlId="filterEndDate">
            <Form.Label>종료일</Form.Label>
            <DatePicker
              selected={filterEndDate}
              onChange={(date: Date | null) => setFilterEndDate(date)}
              dateFormat="yyyy-MM-dd"
              className="form-control"
              isClearable
            />
          </Form.Group>
        </Col>
      </Row>

      {sortedTransactions.length === 0 ? (
        <p>거래 내역이 없습니다.</p>
      ) : (
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr>
              <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>날짜 {sortColumn === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>유형 {sortColumn === 'type' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('currency')} style={{ cursor: 'pointer' }}>통화 {sortColumn === 'currency' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('rate')} style={{ cursor: 'pointer' }}>환율 {sortColumn === 'rate' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>수량 {sortColumn === 'quantity' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('krwAmount')} style={{ cursor: 'pointer' }}>원화 금액 {sortColumn === 'krwAmount' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('fee')} style={{ cursor: 'pointer' }}>수수료 {sortColumn === 'fee' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
              <th>실현 손익</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map(t => (
              <tr key={t.id}>
                <td>{t.date}</td>
                <td>
                  <Badge bg={t.type === 'purchase' ? 'primary' : 'danger'}>
                    {t.type === 'purchase' ? '매수' : '매도'}
                  </Badge>
                </td>
                <td>{t.currency}</td>
                <td>{t.rate.toFixed(t.currency === 'JPY' ? 2 : 2)}</td> {/* JPY rate per 1 unit, so 2 decimal places */}
                <td>{t.quantity.toLocaleString()} {t.currency}</td>
                <td>{formatKrw(t.krwAmount)}</td>
                <td>{formatKrw(t.fee)}</td>
                <td>
                  {t.realizedProfit !== undefined ? (
                    <Badge bg={t.realizedProfit >= 0 ? 'success' : 'danger'}>
                      {formatKrw(t.realizedProfit)}
                    </Badge>
                  ) : '-'}
                </td>
                <td>{t.memo || '-'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default TransactionHistoryPage;
