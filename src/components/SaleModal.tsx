import { useState, useEffect } from 'react';
import { Modal, Button, Form, Table } from 'react-bootstrap';
import type { PurchaseLot } from '../types/definitions';

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
  const [salePrice, setSalePrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [fee, setFee] = useState(0); // New state for fee

  // Reset form or pre-fill when modal is opened/closed or editingRecord changes
  useEffect(() => {
    if (show) {
      if (editingRecord) {
        setSaleDate(editingRecord.saleDate);
        setSalePrice(editingRecord.salePrice);
        setQuantity(editingRecord.quantity);
        setSelectedLotId(editingRecord.purchaseLotId);
        setFee(editingRecord.fee || 0); // Pre-fill fee
      } else {
        setSaleDate(new Date().toISOString().split('T')[0]);
        setSalePrice(0);
        setQuantity(0);
        setSelectedLotId(null);
        setFee(0); // Reset fee
      }
    }
  }, [show, editingRecord]);

  const handleSave = () => {
    const selectedLot = holdings.find(lot => lot.id === selectedLotId);

    if (!selectedLotId || !selectedLot) {
      alert('판매할 매수 묶음을 선택해주세요.');
      return;
    }
    if (salePrice <= 0 || quantity <= 0) {
      alert('환율과 수량은 0보다 커야 합니다.');
      return;
    }
    if (quantity > selectedLot.remainingQuantity + (editingRecord && editingRecord.purchaseLotId === selectedLotId ? editingRecord.quantity : 0)) {
      alert(`판매 수량은 남은 수량(${selectedLot.remainingQuantity.toLocaleString()} ${currencyCode})보다 클 수 없습니다.`);
      return;
    }

    onSave({
      id: editingRecord?.id, // Pass id if editing
      saleDate,
      salePrice: Number(salePrice),
      quantity: Number(quantity),
      purchaseLotId: selectedLotId,
      fee: Number(fee), // Include fee
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
              onChange={(date: Date) => setSaleDate(date.toISOString().split('T')[0])}
              dateFormat="yyyy-MM-dd"
              className="form-control" // Apply Bootstrap styling
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>매도 환율 (1 {currencyCode} 당 KRW)</Form.Label>
            <Form.Control type="number" placeholder="예: 9.55" value={salePrice} onChange={e => setSalePrice(Number(e.target.value))} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>매도 수량 ({currencyCode})</Form.Label>
            <Form.Control type="number" placeholder="판매할 수량" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>수수료 (KRW, 선택)</Form.Label>
            <Form.Control 
              type="number" 
              placeholder="예: 5000"
              value={fee}
              onChange={e => setFee(Number(e.target.value))}
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
                      disabled={editingRecord && editingRecord.purchaseLotId !== lot.id} // Disable other lots when editing
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