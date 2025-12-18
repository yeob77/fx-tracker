import { useState, useMemo } from 'react';
import { Button, Table, Badge, Form, Row, Col } from 'react-bootstrap';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { PurchaseLot, SaleRecord } from '../types/definitions';
import PurchaseModal, { type PurchaseData } from '../components/PurchaseModal';
import SaleModal, { type SaleData } from '../components/SaleModal';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';



const JpyPage = () => {
  const [jpyLots, setJpyLots] = useLocalStorage<PurchaseLot[]>('jpyLots', []);
  const [jpySales, setJpySales] = useLocalStorage<SaleRecord[]>('jpySales', []);

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [editingSaleRecord, setEditingSaleRecord] = useState<SaleRecord | null>(null);
  const [editingPurchaseLot, setEditingPurchaseLot] = useState<PurchaseLot | null>(null);

  // Sorting states for Holdings table
  const [sortColumnHoldings, setSortColumnHoldings] = useState<keyof PurchaseLot>('purchaseDate');
  const [sortDirectionHoldings, setSortDirectionHoldings] = useState<'asc' | 'desc'>('desc');

  // Sorting states for Sales table
  const [sortColumnSales, setSortColumnSales] = useState<keyof SaleRecord>('saleDate');
  const [sortDirectionSales, setSortDirectionSales] = useState<'asc' | 'desc'>('desc');

  // Filtering states for Sales table
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);

  const handleSort = (column: keyof PurchaseLot | keyof SaleRecord, type: 'holdings' | 'sales') => {
    if (type === 'holdings') {
      if (sortColumnHoldings === column) {
        setSortDirectionHoldings(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumnHoldings(column as keyof PurchaseLot);
        setSortDirectionHoldings('asc');
      }
    } else { // sales
      if (sortColumnSales === column) {
        setSortDirectionSales(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumnSales(column as keyof SaleRecord);
        setSortDirectionSales('asc');
      }
    }
  };

  const handleAddPurchase = (data: PurchaseData) => {
    if (data.id) { // Editing an existing purchase
      const originalLot = jpyLots.find(lot => lot.id === data.id);
      if (!originalLot) return;

      // Calculate quantity difference for adjusting sales
      const quantityDifference = data.initialQuantity - originalLot.initialQuantity;

      // If initial quantity is reduced below remaining quantity, disallow
      if (data.initialQuantity < originalLot.initialQuantity - originalLot.remainingQuantity) {
        alert('최초 수량을 현재 판매된 수량보다 적게 변경할 수 없습니다.');
        return;
      }

      setJpyLots(prevLots =>
        prevLots.map(lot =>
          lot.id === data.id
            ? {
                ...data,
                remainingQuantity: lot.remainingQuantity + quantityDifference, // Adjust remaining quantity
                id: lot.id, // Ensure ID is preserved
              } as PurchaseLot
            : lot
        ).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      );

    } else { // Adding a new purchase
      const newLot: PurchaseLot = {
        ...data,
        id: Date.now().toString(),
        remainingQuantity: data.initialQuantity,
        fee: data.fee || 0, // Include fee
      };
      setJpyLots(prevLots => [...prevLots, newLot].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()));
    }
    setShowPurchaseModal(false);
    setEditingPurchaseLot(null); // Clear editing record after save/update
  };

  const handleEditPurchase = (lot: PurchaseLot) => {
    setEditingPurchaseLot(lot);
    setShowPurchaseModal(true);
  };

  const handleDeletePurchase = (lotToDelete: PurchaseLot) => {
    if (!window.confirm('정말로 이 매수 기록을 삭제하시겠습니까? 이 기록과 관련된 매도 기록이 있다면 삭제할 수 없습니다.')) {
      return;
    }

    // Check if there are any sales associated with this purchase lot
    const hasAssociatedSales = jpySales.some(sale => sale.purchaseLotId === lotToDelete.id);
    if (hasAssociatedSales) {
      alert('이 매수 기록과 관련된 매도 기록이 존재하여 삭제할 수 없습니다. 관련 매도 기록을 먼저 삭제해주세요.');
      return;
    }

    // Remove the purchase lot
    setJpyLots(prevLots => prevLots.filter(lot => lot.id !== lotToDelete.id));
  };

  const handleSale = (data: SaleData) => {
    // Find the target purchase lot for the current sale (or edited sale)
    const targetLot = jpyLots.find(lot => lot.id === data.purchaseLotId);
    if (!targetLot) return;

    let updatedJpyLots = [...jpyLots];
    let updatedJpySales = [...jpySales];

    if (data.id) { // Editing an existing sale
      const originalSale = jpySales.find(sale => sale.id === data.id);
      if (!originalSale) return;

      // Adjust the remainingQuantity of the original purchase lot
      updatedJpyLots = updatedJpyLots.map(lot => {
        if (lot.id === originalSale.purchaseLotId) {
          return { ...lot, remainingQuantity: lot.remainingQuantity + originalSale.quantity - data.quantity };
        }
        return lot;
      });

      // Update the sale record
      updatedJpySales = updatedJpySales.map(sale => 
        sale.id === data.id 
          ? { ...data, realizedProfit: (data.salePrice - targetLot.purchasePrice) * data.quantity - (data.fee || 0) } as SaleRecord
          : sale
      ).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

    } else { // Adding a new sale
      const realizedProfit = (data.salePrice - targetLot.purchasePrice) * data.quantity - (data.fee || 0);
      const newSale: SaleRecord = {
        id: Date.now().toString(),
        purchaseLotId: data.purchaseLotId,
        saleDate: data.saleDate,
        salePrice: data.salePrice,
        quantity: data.quantity,
        realizedProfit: realizedProfit,
        fee: data.fee || 0, // Include fee
      };
      updatedJpySales = [...jpySales, newSale].sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

      // Update Purchase Lot for new sale
      updatedJpyLots = updatedJpyLots.map(lot => 
        lot.id === data.purchaseLotId 
          ? { ...lot, remainingQuantity: lot.remainingQuantity - data.quantity }
          : lot
      );
    }

    setJpyLots(updatedJpyLots);
    setJpySales(updatedJpySales);
    setShowSaleModal(false);
    setEditingSaleRecord(null); // Clear editing record after save/update
  };

  const handleEditSale = (sale: SaleRecord) => {
    setEditingSaleRecord(sale);
    setShowSaleModal(true);
  };

  const handleDeleteSale = (saleToDelete: SaleRecord) => {
    if (!window.confirm('정말로 이 매도 기록을 삭제하시겠습니까?')) {
      return;
    }

    // Find the purchase lot associated with this sale
    const purchaseLot = jpyLots.find(lot => lot.id === saleToDelete.purchaseLotId);
    if (purchaseLot) {
      // Add the sold quantity back to the purchase lot's remaining quantity
      const updatedLots = jpyLots.map(lot =>
        lot.id === saleToDelete.purchaseLotId
          ? { ...lot, remainingQuantity: lot.remainingQuantity + saleToDelete.quantity }
          : lot
      );
      setJpyLots(updatedLots);
    }

    // Remove the sale record
    const updatedSales = jpySales.filter(sale => sale.id !== saleToDelete.id);
    setJpySales(updatedSales);
  };

  const handleCloseSaleModal = () => {
    setShowSaleModal(false);
    setEditingSaleRecord(null); // Clear editing record when modal closes
  };

  const handleClosePurchaseModal = () => {
    setShowPurchaseModal(false);
    setEditingPurchaseLot(null); // Clear editing record when modal closes
  };

  const holdings = jpyLots.filter(lot => lot.remainingQuantity > 0);
  const totalRealizedProfit = jpySales.reduce((sum, sale) => sum + sale.realizedProfit, 0);

  const sortedHoldings = useMemo(() => {
    const sortableHoldings = [...holdings];
    sortableHoldings.sort((a, b) => {
      const aValue = a[sortColumnHoldings];
      const bValue = b[sortColumnHoldings];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirectionHoldings === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirectionHoldings === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
    return sortableHoldings;
  }, [holdings, sortColumnHoldings, sortDirectionHoldings]);

  const filteredJpySales = useMemo(() => {
    let filtered = jpySales;
    if (filterStartDate) {
      filtered = filtered.filter(sale => new Date(sale.saleDate) >= filterStartDate);
    }
    if (filterEndDate) {
      // Set end date to end of day for inclusive filtering
      const endDateInclusive = new Date(filterEndDate);
      endDateInclusive.setHours(23, 59, 59, 999);
      filtered = filtered.filter(sale => new Date(sale.saleDate) <= endDateInclusive);
    }
    return filtered;
  }, [jpySales, filterStartDate, filterEndDate]);

  const sortedFilteredJpySales = useMemo(() => {
    const sortableSales = [...filteredJpySales];
    sortableSales.sort((a, b) => {
      const aValue = a[sortColumnSales];
      const bValue = b[sortColumnSales];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirectionSales === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirectionSales === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
    return sortableSales;
  }, [filteredJpySales, sortColumnSales, sortDirectionSales]);

  return (
    <div>
      <h2>엔화 (JPY) 관리</h2>
      
      <div className="my-4">
        <Button variant="primary" onClick={() => { setEditingPurchaseLot(null); setShowPurchaseModal(true); }} className="me-2">
          + 엔화 매수 기록
        </Button>
        <Button variant="success" onClick={() => { setEditingSaleRecord(null); setShowSaleModal(true); }} disabled={holdings.length === 0}>
          - 엔화 매도 기록
        </Button>
      </div>

      <PurchaseModal 
        show={showPurchaseModal} 
        handleClose={handleClosePurchaseModal}
        onSave={handleAddPurchase}
        currencyName="엔화"
        currencyCode="JPY"
        editingRecord={editingPurchaseLot} // Pass editing purchase lot
      />
      <SaleModal 
        show={showSaleModal} 
        handleClose={handleCloseSaleModal}
        onSave={handleSale}
        holdings={holdings}
        currencyName="엔화"
        currencyCode="JPY"
        editingRecord={editingSaleRecord}
      />

      <hr />

      <h4>보유 현황</h4>
      {holdings.length === 0 ? (
        <p>보유 중인 엔화가 없습니다.</p>
      ) : (
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr>
              <th className="fs-6" onClick={() => handleSort('purchaseDate', 'holdings')} style={{ cursor: 'pointer' }}>매수일 {sortColumnHoldings === 'purchaseDate' && (sortDirectionHoldings === 'asc' ? '▲' : '▼')}</th>
              <th className="fs-6" onClick={() => handleSort('purchasePrice', 'holdings')} style={{ cursor: 'pointer' }}>매수환율 {sortColumnHoldings === 'purchasePrice' && (sortDirectionHoldings === 'asc' ? '▲' : '▼')}</th>
              <th className="fs-6" onClick={() => handleSort('initialQuantity', 'holdings')} style={{ cursor: 'pointer' }}>최초수량 {sortColumnHoldings === 'initialQuantity' && (sortDirectionHoldings === 'asc' ? '▲' : '▼')}</th>
              <th className="fs-6" onClick={() => handleSort('remainingQuantity', 'holdings')} style={{ cursor: 'pointer' }}>남은수량 {sortColumnHoldings === 'remainingQuantity' && (sortDirectionHoldings === 'asc' ? '▲' : '▼')}</th>
              <th className="fs-6" onClick={() => handleSort('fee', 'holdings')} style={{ cursor: 'pointer' }}>수수료 {sortColumnHoldings === 'fee' && (sortDirectionHoldings === 'asc' ? '▲' : '▼')}</th>
              <th className="fs-6">메모</th>
              <th className="fs-6">액션</th>
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map(lot => (
              <tr key={lot.id}>
                <td>{lot.purchaseDate}</td>
                <td>{lot.purchasePrice.toFixed(2)}</td>
                <td>{lot.initialQuantity.toLocaleString()} JPY</td>
                <td><strong>{lot.remainingQuantity.toLocaleString()} JPY</strong></td>
                <td>{lot.fee?.toLocaleString() || 0} KRW</td>
                <td>{lot.memo}</td>
                <td>
                  <Button variant="info" size="sm" onClick={() => handleEditPurchase(lot)}>수정</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDeletePurchase(lot)} className="ms-2">삭제</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <hr />

      <h4>
        실현 손익 내역 (총 <Badge bg={totalRealizedProfit >= 0 ? 'success' : 'danger'}>{totalRealizedProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Badge> KRW)
      </h4>
      <Row className="mb-3 align-items-center">
        <Col xs={12} md={4}>
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
        <Col xs={12} md={4}>
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
      {jpySales.length === 0 ? (
        <p>매도 기록이 없습니다.</p>
      ) : (
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr>
              <th onClick={() => handleSort('saleDate', 'sales')} style={{ cursor: 'pointer' }}>매도일 {sortColumnSales === 'saleDate' && (sortDirectionSales === 'asc' ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('quantity', 'sales')} style={{ cursor: 'pointer' }}>수량 {sortColumnSales === 'quantity' && (sortDirectionSales === 'asc' ? '▲' : '▼')}</th>
              <th>매수환율</th>
              <th onClick={() => handleSort('salePrice', 'sales')} style={{ cursor: 'pointer' }}>매도환율 {sortColumnSales === 'salePrice' && (sortDirectionSales === 'asc' ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('fee', 'sales')} style={{ cursor: 'pointer' }}>수수료 {sortColumnSales === 'fee' && (sortDirectionSales === 'asc' ? '▲' : '▼')}</th>
              <th onClick={() => handleSort('realizedProfit', 'sales')} style={{ cursor: 'pointer' }}>실현손익 (KRW) {sortColumnSales === 'realizedProfit' && (sortDirectionSales === 'asc' ? '▲' : '▼')}</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {sortedFilteredJpySales.map(sale => {
              const purchaseLot = jpyLots.find(lot => lot.id === sale.purchaseLotId);
              return (
                <tr key={sale.id}>
                  <td>{sale.saleDate}</td>
                  <td>{sale.quantity.toLocaleString()} JPY</td>
                  <td>{purchaseLot?.purchasePrice.toFixed(2)}</td>
                  <td>{sale.salePrice.toFixed(2)}</td>
                  <td>{sale.fee?.toLocaleString() || 0} KRW</td>
                  <td>
                    <strong className={sale.realizedProfit >= 0 ? 'text-success' : 'text-danger'}>
                      {sale.realizedProfit >= 0 ? '+' : ''}
                      {sale.realizedProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </strong>
                  </td>
                  <td>
                    <Button variant="info" size="sm" onClick={() => handleEditSale(sale)}>수정</Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteSale(sale)} className="ms-2">삭제</Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default JpyPage;