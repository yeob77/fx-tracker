import { useState, useEffect } from 'react';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import type { PurchaseLot, SaleRecord } from '../types/definitions';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export interface SaleData {
  id?: string; // Add optional id for editing
  saleDate: string;
  salePrice: number;
  quantity: number;
  purchaseLotId: string;
  fee: number; // New field for fee
}

interface SaleModalProps {
  show: boolean;
  handleClose: () => void;
  onSave: (data: SaleData) => void;
  holdings: PurchaseLot[]; // Pass current holdings to the modal
  currencyName: string; // e.g., "달러", "엔화"
  currencyCode: string; // e.g., "USD", "JPY"
  editingRecord: SaleRecord | null; // New prop for editing
}

const SaleModal = ({ show, handleClose, onSave, holdings, currencyName, currencyCode, editingRecord }: SaleModalProps) => {
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [salePrice, setSalePrice] = useState<string>(''); // Changed to string
  const [quantity, setQuantity] = useState<string>(''); // Changed to string
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [fee, setFee] = useState<string>(''); // Changed to string

  // Reset form or pre-fill when modal is opened/closed or editingRecord changes
  useEffect(() => {
    if (show) {
      if (editingRecord) {
        setSaleDate(editingRecord.saleDate);
        setSalePrice(String(editingRecord.salePrice)); // Convert to string
        setQuantity(String(editingRecord.quantity)); // Convert to string
        setSelectedLotId(editingRecord.purchaseLotId);
        setFee(String(editingRecord.fee || 0)); // Convert to string
      } else {
        setSaleDate(new Date().toISOString().split('T')[0]);
        setSalePrice(''); // Reset to empty string
        setQuantity(''); // Reset to empty string
        setSelectedLotId(null);
        setFee(''); // Reset to empty string
      }
    }
  }, [show, editingRecord]);

  const handleSave = () => {
    const selectedLot = holdings.find(lot => lot.id === selectedLotId);

    if (!selectedLotId || !selectedLot) {
      alert('판매할 매수 묶음을 선택해주세요.');
      return;
    }
    // Convert string inputs to numbers for validation and saving
    const numSalePrice = Number(salePrice);
    const numQuantity = Number(quantity);
    const numFee = Number(fee);

    if (numSalePrice <= 0 || numQuantity <= 0) {
      alert('환율과 수량은 0보다 커야 합니다.');
      return;
    }
    if (numQuantity > selectedLot.remainingQuantity + (editingRecord && editingRecord.purchaseLotId === selectedLotId ? editingRecord.quantity : 0)) {
      alert(`판매 수량은 남은 수량(${selectedLot.remainingQuantity.toLocaleString()} ${currencyCode})보다 클 수 없습니다.`);
      return;
    }

    onSave({
      id: editingRecord?.id, // Pass id if editing
      saleDate,
      salePrice: numSalePrice,
      quantity: numQuantity,
      purchaseLotId: selectedLotId,
      fee: numFee, // Include fee
    });
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{editingRecord ? `${currencyName} 매도 기록 수정` : `${currencyName} 매도 기록`}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {/* Sale Info Inputs */}
          <Form.Group className="mb-3">
            <Form.Label>매도일</Form.Label>
            <DatePicker
              selected={new Date(saleDate)} // Convert string to Date object
              onChange={(date: Date | null) => date && setSaleDate(date.toISOString().split('T')[0])}
              dateFormat="yyyy-MM-dd"
              className="form-control" // Apply Bootstrap styling
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>매도 환율 (1 {currencyCode} 당 KRW)</Form.Label>
            <Form.Control type="number" placeholder="예: 9.55" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>매도 수량 ({currencyCode})</Form.Label>
            <Form.Control type="number" placeholder="판매할 수량" value={quantity} onChange={e => setQuantity(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>수수료 (KRW, 선택)</Form.Label>
            <Form.Control 
              type="number" 
              placeholder="예: 5000"
              value={fee}
              onChange={e => setFee(e.target.value)}
            />
          </Form.Group>
        </Form>
        
        <hr />

        <h6>판매할 매수 묶음 선택</h6>
        {holdings.length === 0 ? (
          <p>선택할 수 있는 매수 묶음이 없습니다.</p>
        ) : (
          <Table striped bordered hover responsive size="sm">
            <thead>
              <tr>
                <th>선택</th>
                <th>매수일</th>
                <th>매수환율</th>
                <th>남은수량</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(lot => (
                <tr key={lot.id} className={selectedLotId === lot.id ? 'table-primary' : ''}>
                  <td>
                    <Form.Check 
                      type="radio"
                      name="purchaseLot"
                      id={`lot-${lot.id}`}
                      onChange={() => setSelectedLotId(lot.id)}
                      checked={selectedLotId === lot.id}
                      disabled={(editingRecord && editingRecord.purchaseLotId !== lot.id) || false} // Disable other lots when editing
                    />
                  </td>
                  <td>{lot.purchaseDate}</td>
                  <td>{lot.purchasePrice.toFixed(2)}</td>
                  <td>{lot.remainingQuantity.toLocaleString()} {currencyCode}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          닫기
        </Button>
        <Button variant="primary" onClick={handleSave}>
          {editingRecord ? '수정' : '저장'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SaleModal;
