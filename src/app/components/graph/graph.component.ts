import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';

@Component({
    selector: 'app-graph',
    templateUrl: 'graph.component.html',
    styleUrls: ['./graph.component.css']
})
export class GraphComponent implements OnInit {
    @ViewChild('svg', { static: true }) svgElement!: ElementRef<SVGElement>;

    private nodes = [
        { id: 'Node 1' },
        { id: 'Node 2' },
        { id: 'Node 3' },
        { id: 'Node 4' }
    ];

    private links = [
        { source: 'Node 1', target: 'Node 2' },
        { source: 'Node 2', target: 'Node 3' },
        { source: 'Node 3', target: 'Node 4' }
    ];

    ngOnInit(): void {
        this.createNetworkGraph();
    }

    private createNetworkGraph(): void {
        const svg = d3.select(this.svgElement.nativeElement);
        const width = +svg.attr('width');
        const height = +svg.attr('height');

        // Initialize simulation with forces
        const simulation = d3.forceSimulation(this.nodes as any)
            .force('link', d3.forceLink(this.links).id((d: any) => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2));

        // Draw links
        const link = svg.selectAll('.link')
            .data(this.links)
            .enter().append('line')
            .attr('class', 'link')
            .style('stroke', '#999')
            .style('stroke-width', 2);

        // Draw nodes
        const node = svg.selectAll('.node')
            .data(this.nodes)
            .enter().append('circle')
            .attr('class', 'node')
            .attr('r', 10)
            .style('fill', '#ffab00')
            .call(d3.drag<SVGCircleElement, any>()
                .on('start', (event: any, d: any) => this.dragStarted(event, d, simulation))
                .on('drag', (event: any, d: any) => this.dragged(event, d))
                .on('end', (event: any, d: any) => this.dragEnded(event, d, simulation))
            );

        // Update positions on tick
        simulation.on('tick', () => {
            link
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);

            node
                .attr('cx', (d: any) => d.x)
                .attr('cy', (d: any) => d.y);
        });
    }

    private dragStarted(event: any, d: any, simulation: any): void {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    private dragged(event: any, d: any): void {
        d.fx = event.x;
        d.fy = event.y;
    }

    private dragEnded(event: any, d: any, simulation: any): void {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}
