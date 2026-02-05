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

const formatNumberForInput = (value: number | string): string => {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

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
  const isJpy = currencyCode === 'JPY';

  // Effect to pre-fill form when editingRecord changes
  useEffect(() => {
    if (show && editingRecord) {
      const isJpyEdit = editingRecord.currency === 'JPY';
      const displayPrice = isJpyEdit ? editingRecord.purchasePrice * 100 : editingRecord.purchasePrice;
      const calculatedTotalKrw = Math.round(editingRecord.purchasePrice * editingRecord.initialQuantity);

      setFormData({
        currency: editingRecord.currency,
        purchaseDate: editingRecord.purchaseDate,
        purchasePrice: String(displayPrice),
        initialQuantity: String(editingRecord.initialQuantity),
        totalKrwAmount: formatNumberForInput(calculatedTotalKrw), // Formatted
        memo: editingRecord.memo || '',
        fee: formatNumberForInput(editingRecord.fee || 0), // Formatted
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = { ...prev };
      
      // Remove commas for KRW fields before storing in state
      if (name === 'totalKrwAmount' || name === 'fee') {
        newFormData[name as keyof typeof newFormData] = value.replace(/,/g, '');
      } else {
        newFormData[name as keyof typeof newFormData] = value;
      }

      const displayPrice = Number(newFormData.purchasePrice) || 0;
      const effectiveRate = isJpy ? displayPrice / 100 : displayPrice;
      
      let numInitialQuantity = Number(newFormData.initialQuantity) || 0;
      let numTotalKrwAmount = Number(newFormData.totalKrwAmount) || 0;

      if (name === 'purchasePrice' || name === 'initialQuantity') {
        if (calculationMode === 'quantity') { // User is inputting quantity, calculate KRW
          newFormData.totalKrwAmount = String(Math.round(effectiveRate * numInitialQuantity));
        } else { // User is inputting KRW, but changed price or quantity field (less common)
          if (effectiveRate > 0) {
            const calculatedQuantity = numTotalKrwAmount / effectiveRate;
            newFormData.initialQuantity = String(parseFloat(calculatedQuantity.toFixed(2)));
          } else {
            newFormData.initialQuantity = '';
          }
        }
      } else if (name === 'totalKrwAmount') {
        if (calculationMode === 'krw') { // User is inputting KRW, calculate quantity
          if (effectiveRate > 0) {
            const calculatedQuantity = numTotalKrwAmount / effectiveRate;
            newFormData.initialQuantity = String(parseFloat(calculatedQuantity.toFixed(2)));
          } else {
            newFormData.initialQuantity = '';
          }
        } else { // User is inputting quantity, but changed KRW field (should be disabled)
          newFormData.totalKrwAmount = String(Math.round(effectiveRate * numInitialQuantity));
        }
      }
      return newFormData;
    });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Only re-format KRW fields on blur
    if (name === 'totalKrwAmount' || name === 'fee') {
      setFormData(prev => ({
        ...prev,
        [name]: formatNumberForInput(value),
      }));
    }
  };

  const handleSave = () => {
    const displayPrice = Number(formData.purchasePrice);
    const rateToStore = isJpy ? displayPrice / 100 : displayPrice;
    const numInitialQuantity = Number(formData.initialQuantity);
    const numFee = Number(formData.fee.replace(/,/g, '')); // Remove commas for saving

    if (displayPrice <= 0 || numInitialQuantity <= 0) {
      alert('환율과 수량은 0보다 커야 합니다.');
      return;
    }
    onSave({
      id: editingRecord?.id,
      ...formData,
      currency: formData.currency as Currency,
      purchasePrice: rateToStore,
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
            <Form.Label>환율 (1{isJpy ? '00' : ''} {currencyCode} 당 KRW)</Form.Label>
            <Form.Control 
              type="number" // Reverted to number
              name="purchasePrice" 
              placeholder={isJpy ? "예: 930.97" : "예: 1380.50"}
              value={formData.purchasePrice}
              onChange={handleChange}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="initialQuantity">
            <Form.Label>수량 ({currencyCode})</Form.Label>
            <Form.Control 
              type="number" // Reverted to number
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
              type="text" // Changed to text
              name="totalKrwAmount"
              placeholder="자동 계산"
              value={formatNumberForInput(formData.totalKrwAmount)} // Formatted
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={calculationMode === 'quantity'} // Disable if calculating KRW
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="fee">
            <Form.Label>수수료 (KRW, 선택)</Form.Label>
            <Form.Control 
              type="text" // Changed to text
              name="fee" 
              placeholder="예: 5000"
              value={formatNumberForInput(formData.fee)} // Formatted
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="memo">
            <Form.Label>메모 (선택)</Form.Label>
            <Form.Control 
              type="text" 
              name="memo" 
              placeholder="예: 월급날 환전"
              value={formData.memo}
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
