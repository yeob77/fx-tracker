import { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import type { PurchaseLot, Currency } from '../types/definitions';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Omit 'id' and 'remainingQuantity' as they will be set in the parent component
export type PurchaseData = Omit<PurchaseLot, 'id' | 'remainingQuantity'> & { id?: string; fee: number };

interface PurchaseModalProps {
  show: boolean;
  handleClose: () => void;
  onSave: (data: PurchaseData) => void;
  currencyName: string; // e.g., "달러", "엔화"
  currencyCode: string; // e.g., "USD", "JPY"
  editingRecord: PurchaseLot | null; // New prop for editing
}

const PurchaseModal = ({ show, handleClose, onSave, currencyName, currencyCode, editingRecord }: PurchaseModalProps) => {
  const [formData, setFormData] = useState({
    currency: currencyCode,
    purchaseDate: new Date().toISOString().split('T')[0], // Default to today
    purchasePrice: 0,
    initialQuantity: 0,
    memo: '',
    fee: 0, // New field for fee
  });

  const [calculatedKrwAmount, setCalculatedKrwAmount] = useState(0); // New state for calculated KRW amount

  // Effect to pre-fill form when editingRecord changes
  useEffect(() => {
    if (show && editingRecord) {
      setFormData({
        currency: editingRecord.currency,
        purchaseDate: editingRecord.purchaseDate,
        purchasePrice: editingRecord.purchasePrice,
        initialQuantity: editingRecord.initialQuantity,
        memo: editingRecord.memo || '',
        fee: editingRecord.fee || 0,
      });
    } else if (show && !editingRecord) {
      // Reset form for new purchase
      setFormData({
        currency: currencyCode,
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: 0,
        initialQuantity: 0,
        memo: '',
        fee: 0,
      });
    }
  }, [show, editingRecord, currencyCode]); // Add currencyCode to dependencies

  // Effect to calculate KRW amount
  useEffect(() => {
    const { purchasePrice, initialQuantity } = formData;
    const krw = Number(purchasePrice) * Number(initialQuantity);
    setCalculatedKrwAmount(krw);
  }, [formData.purchasePrice, formData.initialQuantity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Basic validation
    if (formData.purchasePrice <= 0 || formData.initialQuantity <= 0) {
      alert('환율과 수량은 0보다 커야 합니다.');
      return;
    }
    onSave({
      id: editingRecord?.id, // Pass id if editing
      ...formData,
      currency: formData.currency as Currency,
      purchasePrice: Number(formData.purchasePrice),
      initialQuantity: Number(formData.initialQuantity),
      fee: Number(formData.fee), // Include fee
    });
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>{editingRecord ? `${currencyName} 매수 기록 수정` : `${currencyName} 매수 기록`}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3" controlId="purchaseDate">
            <Form.Label>매수일</Form.Label>
            <DatePicker
              selected={new Date(formData.purchaseDate)} // Convert string to Date object
              onChange={(date: Date | null) => date && setFormData(prev => ({ ...prev, purchaseDate: date.toISOString().split('T')[0] }))}
              dateFormat="yyyy-MM-dd"
              className="form-control" // Apply Bootstrap styling
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="purchasePrice">
            <Form.Label>환율 (1 {currencyCode} 당 KRW)</Form.Label>
            <Form.Control 
              type="number" 
              name="purchasePrice" 
              placeholder="예: 9.40"
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="initialQuantity">
            <Form.Label>수량 ({currencyCode})</Form.Label>
            <Form.Control 
              type="number" 
              name="initialQuantity" 
              placeholder="예: 10000"
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>총 한화 금액 (자동 계산)</Form.Label>
            <Form.Control
              type="text"
              readOnly
              value={calculatedKrwAmount.toLocaleString()}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="fee">
            <Form.Label>수수료 (KRW, 선택)</Form.Label>
            <Form.Control 
              type="number" 
              name="fee" 
              placeholder="예: 5000"
              value={formData.fee}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="memo">
            <Form.Label>메모 (선택)</Form.Label>
            <Form.Control 
              type="text" 
              name="memo" 
              placeholder="예: 월급날 환전"
              onChange={handleChange}
            />
          </Form.Group>
        </Form>
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

export default PurchaseModal;
