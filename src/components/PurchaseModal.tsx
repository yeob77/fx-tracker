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
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    initialQuantity: '',
    totalKrwAmount: '', // New field for total KRW amount
    memo: '',
    fee: '',
  });

  const [calculationMode, setCalculationMode] = useState<'quantity' | 'krw'>('quantity'); // 'quantity' means input quantity, calculate KRW; 'krw' means input KRW, calculate quantity

  // Effect to pre-fill form when editingRecord changes
  useEffect(() => {
    if (show && editingRecord) {
      const calculatedTotalKrw = Number(editingRecord.purchasePrice) * Number(editingRecord.initialQuantity);
      setFormData({
        currency: editingRecord.currency,
        purchaseDate: editingRecord.purchaseDate,
        purchasePrice: String(editingRecord.purchasePrice),
        initialQuantity: String(editingRecord.initialQuantity),
        totalKrwAmount: String(calculatedTotalKrw), // Calculate and set
        memo: editingRecord.memo || '',
        fee: String(editingRecord.fee || 0),
      });
    } else if (show && !editingRecord) {
      setFormData({
        currency: currencyCode,
        purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: '',
        initialQuantity: '',
        totalKrwAmount: '', // Reset to empty string
        memo: '',
        fee: '',
      });
    }
    setCalculationMode('quantity'); // Reset mode when modal opens
  }, [show, editingRecord, currencyCode]);

  // No longer need a separate useEffect for calculatedKrwAmount as it's handled in handleChange
  // const [calculatedKrwAmount, setCalculatedKrwAmount] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = { ...prev, [name]: value };

      const numPurchasePrice = Number(newFormData.purchasePrice) || 0;
      let numInitialQuantity = Number(newFormData.initialQuantity) || 0;
      let numTotalKrwAmount = Number(newFormData.totalKrwAmount) || 0;

      if (name === 'purchasePrice' || name === 'initialQuantity') {
        if (calculationMode === 'quantity') { // User is inputting quantity, calculate KRW
          newFormData.totalKrwAmount = String(numPurchasePrice * numInitialQuantity);
        } else { // User is inputting KRW, calculate quantity
          if (numPurchasePrice > 0) {
            newFormData.initialQuantity = String(numTotalKrwAmount / numPurchasePrice);
          } else {
            newFormData.initialQuantity = '';
          }
        }
      } else if (name === 'totalKrwAmount') {
        if (calculationMode === 'krw') { // User is inputting KRW, calculate quantity
          if (numPurchasePrice > 0) {
            newFormData.initialQuantity = String(numTotalKrwAmount / numPurchasePrice);
          } else {
            newFormData.initialQuantity = '';
          }
        } else { // This case should not happen if mode is 'quantity' and totalKrwAmount is changed directly
          // But if it does, recalculate totalKrwAmount based on price and quantity
          newFormData.totalKrwAmount = String(numPurchasePrice * numInitialQuantity);
        }
      }
      return newFormData;
    });
  };

  const handleSave = () => {
    const numPurchasePrice = Number(formData.purchasePrice);
    const numInitialQuantity = Number(formData.initialQuantity);
    const numFee = Number(formData.fee);

    if (numPurchasePrice <= 0 || numInitialQuantity <= 0) {
      alert('환율과 수량은 0보다 커야 합니다.');
      return;
    }
    onSave({
      id: editingRecord?.id,
      ...formData,
      currency: formData.currency as Currency,
      purchasePrice: numPurchasePrice,
      initialQuantity: numInitialQuantity,
      fee: numFee,
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

          <Form.Group className="mb-3">
            <Form.Label>계산 방식</Form.Label>
            <div>
              <Form.Check
                inline
                type="radio"
                label="수량 입력 (총 한화 계산)"
                name="calculationMode"
                id="mode-quantity"
                checked={calculationMode === 'quantity'}
                onChange={() => setCalculationMode('quantity')}
              />
              <Form.Check
                inline
                type="radio"
                label="총 한화 입력 (수량 계산)"
                name="calculationMode"
                id="mode-krw"
                checked={calculationMode === 'krw'}
                onChange={() => setCalculationMode('krw')}
              />
            </div>
          </Form.Group>

          <Form.Group className="mb-3" controlId="purchasePrice">
            <Form.Label>환율 (1 {currencyCode} 당 KRW)</Form.Label>
            <Form.Control 
              type="number" 
              name="purchasePrice" 
              placeholder="예: 9.40"
              value={formData.purchasePrice}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="initialQuantity">
            <Form.Label>수량 ({currencyCode})</Form.Label>
            <Form.Control 
              type="number" 
              name="initialQuantity" 
              placeholder="예: 10000"
              value={formData.initialQuantity}
              onChange={handleChange}
              disabled={calculationMode === 'krw'} // Disable if calculating quantity
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>총 한화 금액 (자동 계산)</Form.Label>
            <Form.Control
              type="number" // Changed to number for direct input
              name="totalKrwAmount"
              placeholder="자동 계산"
              value={formData.totalKrwAmount}
              onChange={handleChange}
              disabled={calculationMode === 'quantity'} // Disable if calculating KRW
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
