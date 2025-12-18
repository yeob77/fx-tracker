import { useLocalStorage } from '../hooks/useLocalStorage';
import type { PurchaseLot, SaleRecord } from '../types/definitions';
import { Card, ListGroup, Badge, Row, Col, Button } from 'react-bootstrap'; // Import Button

// Chart imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const HomePage = () => {
  const [usdLots] = useLocalStorage<PurchaseLot[]>('usdLots', []);
  const [usdSales] = useLocalStorage<SaleRecord[]>('usdSales', []);
  const [jpyLots] = useLocalStorage<PurchaseLot[]>('jpyLots', []);
  const [jpySales] = useLocalStorage<SaleRecord[]>('jpySales', []);

  const calculateSummary = (lots: PurchaseLot[], sales: SaleRecord[]) => {
    const holdings = lots.filter(lot => lot.remainingQuantity > 0);
    
    const totalRealizedProfit = sales.reduce((sum, sale) => sum + sale.realizedProfit, 0);
    
    const totalHoldingQuantity = holdings.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
    
    const totalPurchaseValue = holdings.reduce((sum, lot) => sum + (lot.purchasePrice * lot.remainingQuantity), 0);
    
    const averagePurchasePrice = totalHoldingQuantity > 0 ? totalPurchaseValue / totalHoldingQuantity : 0;

    return {
      holdings,
      totalRealizedProfit,
      totalHoldingQuantity,
      totalPurchaseValue,
      averagePurchasePrice,
    };
  };

  const usdSummary = calculateSummary(usdLots, usdSales);
  const jpySummary = calculateSummary(jpyLots, jpySales);

  const grandTotalRealizedProfit = usdSummary.totalRealizedProfit + jpySummary.totalRealizedProfit;

  const formatKrw = (amount: number) => {
    return `${amount >= 0 ? '' : '-'}${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })} KRW`;
  }

  // --- Chart Data Preparation ---
  const getCumulativeSalesData = (sales: SaleRecord[]) => {
    const sortedSales = [...sales].sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());

    const chartLabels: string[] = [];
    const chartData: number[] = [];
    let cumulativeProfit = 0;

    sortedSales.forEach(sale => {
      cumulativeProfit += sale.realizedProfit;
      chartLabels.push(sale.saleDate);
      chartData.push(cumulativeProfit);
    });
    return { chartLabels, chartData };
  };

  const { chartLabels: combinedChartLabels, chartData: combinedChartDataPoints } = getCumulativeSalesData([...usdSales, ...jpySales]);
  const { chartLabels: usdChartLabels, chartData: usdChartDataPoints } = getCumulativeSalesData(usdSales);
  const { chartLabels: jpyChartLabels, chartData: jpyChartDataPoints } = getCumulativeSalesData(jpySales);

  // Combine all labels, ensuring uniqueness and sorting
  const allLabels = Array.from(new Set([...combinedChartLabels, ...usdChartLabels, ...jpyChartLabels])).sort();

  // Helper to fill missing data points for a dataset
  const fillMissingData = (labels: string[], dataPoints: number[], allLabels: string[]) => {
    const filledData: number[] = [];
    let dataIndex = 0;
    let lastValue = 0;

    allLabels.forEach(label => {
      if (dataIndex < labels.length && labels[dataIndex] === label) {
        lastValue = dataPoints[dataIndex];
        filledData.push(lastValue);
        dataIndex++;
      } else {
        filledData.push(lastValue); // Carry over the last known value
      }
    });
    return filledData;
  };

  const chartData = {
    labels: allLabels,
    datasets: [
      {
        label: '총 누적 실현 손익 (KRW)',
        data: fillMissingData(combinedChartLabels, combinedChartDataPoints, allLabels),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
        fill: false,
      },
      {
        label: '달러 누적 실현 손익 (KRW)',
        data: fillMissingData(usdChartLabels, usdChartDataPoints, allLabels),
        borderColor: 'rgb(54, 162, 235)', // Blue
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.1,
        fill: false,
      },
      {
        label: '엔화 누적 실현 손익 (KRW)',
        data: fillMissingData(jpyChartLabels, jpyChartDataPoints, allLabels),
        borderColor: 'rgb(255, 99, 132)', // Red
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.1,
        fill: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '누적 실현 손익 추이 (통화별)',
      },
    },
    scales: {
      x: {
        type: 'category' as const, // Ensure x-axis is treated as categories (dates)
        labels: allLabels,
      },
    },
  };
  // --- End Chart Data Preparation ---

  const handleExportData = () => {
    const dataToExport = {
      usdLots: JSON.parse(localStorage.getItem('usdLots') || '[]'),
      usdSales: JSON.parse(localStorage.getItem('usdSales') || '[]'),
      jpyLots: JSON.parse(localStorage.getItem('jpyLots') || '[]'),
      jpySales: JSON.parse(localStorage.getItem('jpySales') || '[]'),
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fx_tracker_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);

        // Basic validation
        if (importedData.usdLots && importedData.usdSales && importedData.jpyLots && importedData.jpySales) {
          if (window.confirm('데이터를 가져오면 현재 모든 기록이 덮어씌워집니다. 계속하시겠습니까?')) {
            localStorage.setItem('usdLots', JSON.stringify(importedData.usdLots));
            localStorage.setItem('usdSales', JSON.stringify(importedData.usdSales));
            localStorage.setItem('jpyLots', JSON.stringify(importedData.jpyLots));
            localStorage.setItem('jpySales', JSON.stringify(importedData.jpySales));
            alert('데이터를 성공적으로 가져왔습니다. 페이지를 새로고침합니다.');
            window.location.reload(); // Reload page to reflect changes
          }
        } else {
          alert('유효하지 않은 데이터 파일입니다. 필요한 모든 데이터가 포함되어 있지 않습니다.');
        }
      } catch (error) {
        alert('파일을 읽거나 파싱하는 중 오류가 발생했습니다: ' + error);
      }
    };
    reader.readAsText(file);
  };

  const handleResetApp = () => {
    if (window.confirm('정말로 모든 데이터를 삭제하고 앱을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      localStorage.removeItem('usdLots');
      localStorage.removeItem('usdSales');
      localStorage.removeItem('jpyLots');
      localStorage.removeItem('jpySales');
      localStorage.removeItem('theme'); // Also reset theme
      alert('모든 데이터가 삭제되었습니다. 앱을 새로고침합니다.');
      window.location.reload(); // Reload page to reflect changes
    }
  };

  return (
    <div>
      <Row className="align-items-center mb-4">
        <Col>
          <h1 className="mb-0">전체 요약</h1>
        </Col>
        <Col xs={12} md="auto" className="d-grid gap-2 d-md-block">
          <Button variant="outline-primary" onClick={handleExportData} className="me-2">데이터 내보내기</Button>
          <label htmlFor="import-file" className="btn btn-outline-secondary mb-0 me-2">
            데이터 가져오기
          </label>
          <input
            type="file"
            id="import-file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportData}
          />
          <Button variant="outline-danger" onClick={handleResetApp}>앱 초기화</Button>
        </Col>
      </Row>

      <Card className="mb-4 text-center">
        <Card.Header>
          <h4>총 실현 손익</h4>
        </Card.Header>
        <Card.Body>
          <h2 className={grandTotalRealizedProfit >= 0 ? 'text-success' : 'text-danger'}>
            {formatKrw(grandTotalRealizedProfit)}
          </h2>
        </Card.Body>
      </Card>

      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header><h5>달러 (USD) 현황</h5></Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item>
                보유량: <strong>{usdSummary.totalHoldingQuantity.toLocaleString()} USD</strong>
              </ListGroup.Item>
              <ListGroup.Item>
                평균 매수 단가: <strong>{usdSummary.averagePurchasePrice.toFixed(2)} KRW</strong>
              </ListGroup.Item>
              <ListGroup.Item>
                총 투자 원금 (현재 보유분): <strong>{formatKrw(usdSummary.totalPurchaseValue)}</strong>
              </ListGroup.Item>
              <ListGroup.Item>
                실현 손익 (USD): 
                <Badge bg={usdSummary.totalRealizedProfit >= 0 ? 'success' : 'danger'} className="ms-2">
                  {formatKrw(usdSummary.totalRealizedProfit)}
                </Badge>
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header><h5>엔화 (JPY) 현황</h5></Card.Header>
            <ListGroup variant="flush">
              <ListGroup.Item>
                보유량: <strong>{jpySummary.totalHoldingQuantity.toLocaleString()} JPY</strong>
              </ListGroup.Item>
              <ListGroup.Item>
                평균 매수 단가: <strong>{jpySummary.averagePurchasePrice.toFixed(2)} KRW</strong>
              </ListGroup.Item>
              <ListGroup.Item>
                총 투자 원금 (현재 보유분): <strong>{formatKrw(jpySummary.totalPurchaseValue)}</strong>
              </ListGroup.Item>
              <ListGroup.Item>
                실현 손익 (JPY): 
                <Badge bg={jpySummary.totalRealizedProfit >= 0 ? 'success' : 'danger'} className="ms-2">
                  {formatKrw(jpySummary.totalRealizedProfit)}
                </Badge>
              </ListGroup.Item>
            </ListGroup>
          </Card>
        </Col>
      </Row>

      {(usdSales.length > 0 || jpySales.length > 0) && (
        <Card className="mb-4">
          <Card.Header>
            <h5>누적 실현 손익 추이 (통화별)</h5>
          </Card.Header>
          <Card.Body>
            <Line options={chartOptions} data={chartData} />
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default HomePage;