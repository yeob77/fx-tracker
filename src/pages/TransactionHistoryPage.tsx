import { useState, useMemo } from 'react';
import { Table, Badge, Form, Row, Col, Collapse, Button } from 'react-bootstrap'; // Added Button, Collapse
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

  console.log('TransactionHistoryPage: usdLots', usdLots);
  console.log('TransactionHistoryPage: usdSales', usdSales);
  console.log('TransactionHistoryPage: jpyLots', jpyLots);
  console.log('TransactionHistoryPage: jpySales', jpySales);

  const [filterCurrency, setFilterCurrency] = useState<'all' | 'USD' | 'JPY'>('all');
  const [filterType, setFilterType] = useState<'all' | 'purchase' | 'sale'>('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [openFilters, setOpenFilters] = useState(false); // New state for filter collapse

  const [sortColumn, setSortColumn] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const formatKrw = (amount: number) => {
    return `${amount >= 0 ? '' : '-'}${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })} KRW`;
  };

  const allTransactions: Transaction[] = useMemo(() => {
    const purchases: Transaction[] = [
      ...usdLots.map((lot): Transaction => ({ // Explicitly type the returned object
        id: lot.id,
        type: 'purchase',
        currency: lot.currency, // lot.currency is already 'USD' | 'JPY'
        date: lot.purchaseDate,
        rate: lot.purchasePrice,
        quantity: lot.initialQuantity,
        krwAmount: Math.round(lot.purchasePrice * lot.initialQuantity),
        fee: lot.fee || 0,
        memo: lot.memo,
      })),
      ...jpyLots.map((lot): Transaction => ({ // Explicitly type the returned object
        id: lot.id,
        type: 'purchase',
        currency: lot.currency, // lot.currency is already 'USD' | 'JPY'
        date: lot.purchaseDate,
        rate: lot.purchasePrice,
        quantity: lot.initialQuantity,
        krwAmount: Math.round(lot.purchasePrice * lot.initialQuantity),
        fee: lot.fee || 0,
        memo: lot.memo,
      })),
    ];

    const sales: Transaction[] = [
      ...usdSales.map((sale): Transaction => { // Explicitly type the returned object
        // const _purchaseLot = usdLots.find(lot => lot.id === sale.purchaseLotId); // Removed unused variable
        return {
          id: sale.id,
          type: 'sale',
          currency: sale.currency, // sale.currency is already 'USD' | 'JPY'
          date: sale.saleDate,
          rate: sale.salePrice,
          quantity: sale.quantity,
          krwAmount: Math.round(sale.salePrice * sale.quantity),
          fee: sale.fee || 0,
          realizedProfit: sale.realizedProfit,
        };
      }),
      ...jpySales.map((sale): Transaction => { // Explicitly type the returned object
        // const _purchaseLot = jpyLots.find(lot => lot.id === sale.purchaseLotId); // Removed unused variable
        return {
          id: sale.id,
          type: 'sale',
          currency: sale.currency, // sale.currency is already 'USD' | 'JPY'
          date: sale.saleDate,
          rate: sale.salePrice,
          quantity: sale.quantity,
          krwAmount: Math.round(sale.salePrice * sale.quantity),
          fee: sale.fee || 0,
          realizedProfit: sale.realizedProfit,
        };
      }),
    ];

    console.log('TransactionHistoryPage: allTransactions (inside useMemo)', [...purchases, ...sales]);
    return [...purchases, ...sales];
  }, [usdLots, usdSales, jpyLots, jpySales]);

  console.log('TransactionHistoryPage: allTransactions (after useMemo)', allTransactions);

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
    console.log('TransactionHistoryPage: filteredTransactions', filtered);
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
    console.log('TransactionHistoryPage: sortedTransactions', sortableTransactions);
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

      <div className="d-grid gap-2 mb-3">
        <Button
          onClick={() => setOpenFilters(!openFilters)}
          aria-controls="transaction-filters"
          aria-expanded={openFilters}
          variant="outline-secondary"
          className="d-md-none" // Show only on mobile
        >
          {openFilters ? '필터 숨기기' : '필터 보기'}
        </Button>
      </div>

      <Collapse in={openFilters} className="d-md-block"> {/* Always show on desktop */}
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
      </Collapse>

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